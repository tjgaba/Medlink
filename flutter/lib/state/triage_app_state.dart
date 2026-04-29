import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../models/triage_case.dart';
import '../services/transcript_parser.dart';
import '../services/triage_api_service.dart';

class TriageAppState extends ChangeNotifier {
  final _api = TriageApiService();
  final _storage = const FlutterSecureStorage();
  final _speech = SpeechToText();
  final _parser = TranscriptParser();

  bool isRestoringSession = true;
  bool isLoading = false;
  bool isListening = false;
  String? token;
  String? errorMessage;
  String? noticeMessage;
  String? assignmentNotificationMessage;
  TriageCaseDraft draft = TriageCaseDraft();
  SubmittedCase? lastSubmittedCase;
  SubmittedCase? assignmentNotificationCase;
  final List<TriageCaseDraft> offlineQueue = [];
  final Set<String> _knownAssignedCaseIds = <String>{};
  Timer? _assignmentPoller;

  bool get isAuthenticated => token != null && token!.isNotEmpty;

  Future<void> restoreSession() async {
    token = await _storage.read(key: 'jwt_token');
    _api.setToken(token);
    if (isAuthenticated) {
      _startAssignmentPolling();
    }
    isRestoringSession = false;
    notifyListeners();
  }

  Future<void> login(String username, String password) async {
    await _run(() async {
      token = await _api.login(username: username, password: password);
      await _storage.write(key: 'jwt_token', value: token);
      _api.setToken(token);
      _startAssignmentPolling();
    });
  }

  Future<void> logout() async {
    _stopAssignmentPolling();
    token = null;
    assignmentNotificationMessage = null;
    assignmentNotificationCase = null;
    _knownAssignedCaseIds.clear();
    await _storage.delete(key: 'jwt_token');
    _api.setToken(null);
    notifyListeners();
  }

  void clearAssignmentNotification() {
    assignmentNotificationMessage = null;
    assignmentNotificationCase = null;
    notifyListeners();
  }

  void updateDraft(void Function(TriageCaseDraft draft) update) {
    update(draft);
    notifyListeners();
  }

  Future<void> startVoiceCapture() async {
    errorMessage = null;
    final available = await _speech.initialize(
      onStatus: (status) {
        isListening = status == 'listening';
        notifyListeners();
      },
      onError: (error) {
        errorMessage = error.errorMsg;
        isListening = false;
        notifyListeners();
      },
    );

    if (!available) {
      errorMessage = 'Speech recognition is not available on this device.';
      notifyListeners();
      return;
    }

    isListening = true;
    notifyListeners();
    await _speech.listen(
      listenMode: ListenMode.dictation,
      onResult: (result) {
        draft = _parser.applyTranscript(draft, result.recognizedWords);
        notifyListeners();
      },
    );
  }

  Future<void> stopVoiceCapture() async {
    await _speech.stop();
    isListening = false;
    notifyListeners();
  }

  Future<void> submitDraft() async {
    await _run(() async {
      final connectivity = await Connectivity().checkConnectivity();
      if (connectivity.contains(ConnectivityResult.none)) {
        offlineQueue.add(draft);
        noticeMessage = 'No network. Case saved to offline queue.';
        draft = TriageCaseDraft();
        return;
      }

      lastSubmittedCase = await _api.submitCase(draft);
      if (lastSubmittedCase!.isAssignedNotificationCandidate) {
        _knownAssignedCaseIds.add(lastSubmittedCase!.id);
      }
      draft = TriageCaseDraft();
    });
  }

  Future<void> flushOfflineQueue() async {
    if (offlineQueue.isEmpty) {
      return;
    }

    await _run(() async {
      final pending = List<TriageCaseDraft>.from(offlineQueue);
      for (final item in pending) {
        await _api.submitCase(item);
        offlineQueue.remove(item);
      }
      noticeMessage = 'Offline queue sent.';
    });
  }

  Future<void> _run(Future<void> Function() action) async {
    isLoading = true;
    errorMessage = null;
    noticeMessage = null;
    notifyListeners();
    try {
      await action();
    } catch (error) {
      errorMessage = _formatError(error);
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  void _startAssignmentPolling() {
    _stopAssignmentPolling();
    _knownAssignedCaseIds.clear();

    // Seed existing assignments so only new assignments trigger notifications.
    unawaited(_pollAssignedCases(seedOnly: true));
    _assignmentPoller = Timer.periodic(const Duration(seconds: 15), (_) {
      unawaited(_pollAssignedCases());
    });
  }

  void _stopAssignmentPolling() {
    _assignmentPoller?.cancel();
    _assignmentPoller = null;
  }

  Future<void> _pollAssignedCases({bool seedOnly = false}) async {
    if (!isAuthenticated) {
      return;
    }

    try {
      final cases = await _api.getCases();
      final assignedCases = cases
          .where(
            (caseItem) =>
                caseItem.id.trim().isNotEmpty &&
                caseItem.isAssignedNotificationCandidate,
          )
          .toList(growable: false);
      final assignedIds = assignedCases.map((caseItem) => caseItem.id).toSet();

      if (seedOnly) {
        _knownAssignedCaseIds.addAll(assignedIds);
        return;
      }

      final newlyAssignedCases = assignedCases
          .where((caseItem) => !_knownAssignedCaseIds.contains(caseItem.id))
          .toList(growable: false);
      _knownAssignedCaseIds.addAll(assignedIds);

      if (newlyAssignedCases.isEmpty) {
        return;
      }

      final assignedCase = newlyAssignedCases.first;
      assignmentNotificationCase = assignedCase;
      assignmentNotificationMessage =
          '${assignedCase.displayCode} assigned to ${assignedCase.assignedStaffName}.';
      notifyListeners();
    } on DioException {
      // Keep polling silent; visible errors are reserved for user actions.
    } catch (_) {
      // Ignore malformed rows from the dashboard feed and retry on the next poll.
    }
  }

  @override
  void dispose() {
    _stopAssignmentPolling();
    super.dispose();
  }

  String _formatError(Object error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map<String, dynamic>) {
        return '${data['detail'] ?? data['message'] ?? error.message}';
      }
      if (error.response?.statusCode != null) {
        return 'Request failed with status ${error.response!.statusCode}.';
      }
      return error.message ?? 'Network request failed.';
    }
    return error.toString();
  }
}
