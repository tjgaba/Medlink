import 'package:dio/dio.dart';

import '../app_config.dart';
import '../models/triage_case.dart';

class TriageApiService {
  TriageApiService()
      : _dio = Dio(
          BaseOptions(
            baseUrl: AppConfig.baseUrl,
            connectTimeout: const Duration(seconds: 8),
            receiveTimeout: const Duration(seconds: 25),
            headers: {'Content-Type': 'application/json'},
          ),
        );

  final Dio _dio;

  void setToken(String? token) {
    if (token == null || token.isEmpty) {
      _dio.options.headers.remove('Authorization');
      return;
    }
    _dio.options.headers['Authorization'] = 'Bearer $token';
  }

  Future<String> login({
    required String username,
    required String password,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/auth/login',
      data: {'username': username, 'password': password},
    );
    final token = response.data?['token'] ?? response.data?['accessToken'];
    if (token is! String || token.isEmpty) {
      throw StateError('Login succeeded but no JWT token was returned.');
    }
    return token;
  }

  Future<SubmittedCase> submitCase(TriageCaseDraft draft) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/cases',
      data: draft.toPayload(),
    );
    return SubmittedCase.fromJson(response.data ?? {});
  }

  Future<List<SubmittedCase>> getCases() async {
    // The dashboard feed powers assignment notifications in the Flutter app.
    final response = await _dio.get<List<dynamic>>('/cases');
    final data = response.data ?? const [];

    return data
        .whereType<Map<String, dynamic>>()
        .map(SubmittedCase.fromJson)
        .toList(growable: false);
  }
}
