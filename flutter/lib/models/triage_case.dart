class TriageCaseDraft {
  TriageCaseDraft({
    this.patientName = '',
    this.transcript = '',
    this.symptomsSummary = '',
    this.heartRate,
    this.oxygenLevel,
    this.bloodPressure = '',
    this.respiratoryRate,
    this.temperature,
    this.consciousnessLevel = 'Alert',
    this.patientStatus = 'Arrived',
    this.zoneName = 'Emergency Intake',
    this.severity = 'Yellow',
    this.department = 'General',
    this.etaMinutes = 15,
  });

  String patientName;
  String transcript;
  String symptomsSummary;
  int? heartRate;
  int? oxygenLevel;
  String bloodPressure;
  int? respiratoryRate;
  double? temperature;
  String consciousnessLevel;
  String patientStatus;
  String zoneName;
  String severity;
  String department;
  int etaMinutes;

  bool get isOxygenMissing => oxygenLevel == null;
  bool get isVitalsSparse => heartRate == null && oxygenLevel == null;

  Map<String, dynamic> toPayload() {
    final vitals = [
      if (heartRate != null) 'HR $heartRate',
      if (oxygenLevel != null) 'O2 $oxygenLevel%',
      if (bloodPressure.trim().isNotEmpty) 'BP ${bloodPressure.trim()}',
      if (respiratoryRate != null) 'RR $respiratoryRate',
      if (temperature != null) 'Temp ${temperature!.toStringAsFixed(1)}C',
      if (consciousnessLevel.trim().isNotEmpty) 'Consciousness $consciousnessLevel',
    ].join('; ');

    final symptoms = symptomsSummary.trim().isEmpty
        ? 'Symptoms pending review.'
        : symptomsSummary.trim();

    return {
      'patientName': patientName.trim().isEmpty
          ? 'Patient details pending'
          : patientName.trim(),
      'severity': severity,
      'department': department,
      'symptomsSummary': vitals.isEmpty ? symptoms : '$symptoms Vitals: $vitals.',
      'zoneName': zoneName,
      'status': _caseStatusFor(patientStatus),
      'patientStatus': patientStatus,
      'bloodPressure': bloodPressure.trim().isEmpty ? null : bloodPressure.trim(),
      'heartRate': heartRate,
      'respiratoryRate': respiratoryRate,
      'temperature': temperature,
      'oxygenSaturation': oxygenLevel,
      'consciousnessLevel': consciousnessLevel.trim().isEmpty
          ? null
          : consciousnessLevel.trim(),
      'requiredSpecialization': department == 'Critical Care'
          ? 'Critical Care'
          : department,
      'etaMinutes': etaMinutes,
      'displayCode': '',
    };
  }

  static String _caseStatusFor(String patientStatus) {
    return switch (patientStatus) {
      'Under Treatment' => 'InProgress',
      'Transferred' => 'Assigned',
      _ => 'Pending',
    };
  }
}

class SubmittedCase {
  const SubmittedCase({
    required this.id,
    required this.displayCode,
    required this.patientName,
    required this.priority,
    required this.department,
    required this.allocation,
    required this.patientStatus,
    required this.caseStatus,
    this.assignedStaffName = '',
  });

  final String id;
  final String displayCode;
  final String patientName;
  final String priority;
  final String department;
  final String allocation;
  final String patientStatus;
  final String caseStatus;
  final String assignedStaffName;

  bool get hasAssignedStaff =>
      assignedStaffName.trim().isNotEmpty &&
      assignedStaffName.trim().toLowerCase() != 'unassigned';

  bool get isAssignedNotificationCandidate {
    final status = caseStatus.toLowerCase().replaceAll(' ', '');
    return hasAssignedStaff && (status == 'assigned' || status == 'inprogress');
  }

  factory SubmittedCase.fromJson(Map<String, dynamic> json) {
    final assignedStaff = json['assignedStaff'];
    final assignedStaffName = assignedStaff is Map<String, dynamic>
        ? assignedStaff['name']
        : json['assignedStaffName'];

    return SubmittedCase(
      id: '${json['id'] ?? ''}',
      displayCode: '${json['displayCode'] ?? json['caseCode'] ?? 'CASE'}',
      patientName: '${json['patientName'] ?? 'Patient details pending'}',
      priority: _priorityLabel('${json['severity'] ?? 'Yellow'}'),
      department: _formatDepartment('${json['department'] ?? 'General'}'),
      allocation: '${json['zone'] ?? json['zoneName'] ?? 'Emergency Intake'}',
      patientStatus: '${json['patientStatus'] ?? 'Arrived'}',
      caseStatus: '${json['status'] ?? 'Pending'}',
      assignedStaffName: '${assignedStaffName ?? ''}',
    );
  }

  static String _priorityLabel(String severity) {
    return switch (severity.toLowerCase()) {
      'red' => 'High',
      'orange' => 'Medium',
      'green' => 'Low',
      _ => 'Low',
    };
  }

  static String _formatDepartment(String value) {
    return value.replaceAllMapped(
      RegExp(r'([a-z])([A-Z])'),
      (match) => '${match.group(1)} ${match.group(2)}',
    );
  }
}
