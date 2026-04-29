import '../models/triage_case.dart';

class TranscriptParser {
  TriageCaseDraft applyTranscript(TriageCaseDraft draft, String transcript) {
    final text = transcript.toLowerCase();
    draft.transcript = transcript;
    draft.symptomsSummary = transcript.trim();

    final oxygen = _firstInt(text, [
      RegExp(r'(?:oxygen|o2|sats|saturation)\D{0,8}(\d{2,3})'),
      RegExp(r'(\d{2,3})\s?(?:percent|%)'),
    ]);
    if (oxygen != null) {
      draft.oxygenLevel = oxygen.clamp(0, 100);
    }

    final heartRate = _firstInt(text, [
      RegExp(r'(?:heart rate|pulse|hr)\D{0,8}(\d{2,3})'),
    ]);
    if (heartRate != null) {
      draft.heartRate = heartRate;
    }

    final temperature = RegExp(r'(?:temp|temperature)\D{0,8}(\d{2}(?:\.\d)?)')
        .firstMatch(text);
    if (temperature != null) {
      draft.temperature = double.tryParse(temperature.group(1)!);
    }

    final bp = RegExp(r'(\d{2,3})\s?over\s?(\d{2,3})').firstMatch(text);
    if (bp != null) {
      draft.bloodPressure = '${bp.group(1)}/${bp.group(2)}';
    }

    final respiratoryRate = _firstInt(text, [
      RegExp(r'(?:respiratory rate|respiration|breathing rate|rr)\D{0,8}(\d{1,3})'),
    ]);
    if (respiratoryRate != null) {
      draft.respiratoryRate = respiratoryRate;
    }

    if (text.contains('unconscious')) {
      draft.consciousnessLevel = 'Unconscious';
    } else if (text.contains('confused')) {
      draft.consciousnessLevel = 'Confused';
    } else if (text.contains('drowsy')) {
      draft.consciousnessLevel = 'Drowsy';
    } else if (text.contains('alert')) {
      draft.consciousnessLevel = 'Alert';
    }

    draft.department = _detectDepartment(text);
    draft.severity = _detectSeverity(text, draft.oxygenLevel);
    draft.patientStatus = text.contains('transit') || text.contains('ambulance')
        ? 'On Transit'
        : text.contains('under treatment')
            ? 'Under Treatment'
            : 'Arrived';

    return draft;
  }

  int? _firstInt(String text, List<RegExp> patterns) {
    for (final pattern in patterns) {
      final match = pattern.firstMatch(text);
      if (match != null) {
        return int.tryParse(match.group(1)!);
      }
    }
    return null;
  }

  String _detectSeverity(String text, int? oxygen) {
    if (oxygen != null && oxygen < 90) {
      return 'Red';
    }
    if (text.contains('unconscious') ||
        text.contains('septic') ||
        text.contains('shock') ||
        text.contains('major trauma')) {
      return 'Red';
    }
    if (text.contains('chest pain') ||
        text.contains('stroke') ||
        text.contains('shortness of breath') ||
        text.contains('seizure')) {
      return 'Orange';
    }
    if (text.contains('fracture') || text.contains('fever')) {
      return 'Yellow';
    }
    return 'Green';
  }

  String _detectDepartment(String text) {
    if (text.contains('chest pain') || text.contains('cardiac')) {
      return 'Cardiology';
    }
    if (text.contains('trauma') || text.contains('collision')) {
      return 'Trauma';
    }
    if (text.contains('stroke') || text.contains('seizure')) {
      return 'Neurology';
    }
    if (text.contains('child') || text.contains('pediatric')) {
      return 'Pediatrics';
    }
    if (text.contains('x-ray') || text.contains('fracture')) {
      return 'Radiology';
    }
    if (text.contains('oxygen') || text.contains('septic')) {
      return 'Critical Care';
    }
    return 'General';
  }
}
