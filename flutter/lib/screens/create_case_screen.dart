import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/triage_case.dart';
import '../state/triage_app_state.dart';
import '../widgets/field_warning.dart';
import '../widgets/section_card.dart';
import 'case_status_screen.dart';

class CreateCaseScreen extends StatefulWidget {
  const CreateCaseScreen({super.key});

  @override
  State<CreateCaseScreen> createState() => _CreateCaseScreenState();
}

class _CreateCaseScreenState extends State<CreateCaseScreen> {
  final _patientController = TextEditingController();
  final _symptomsController = TextEditingController();
  final _heartRateController = TextEditingController();
  final _oxygenController = TextEditingController();
  final _bloodPressureController = TextEditingController();
  final _respiratoryRateController = TextEditingController();
  final _temperatureController = TextEditingController();
  final _consciousnessLevels = const [
    'Alert',
    'Confused',
    'Drowsy',
    'Unconscious',
  ];

  final _departments = const [
    'General',
    'Cardiology',
    'Trauma',
    'Neurology',
    'Pediatrics',
    'Radiology',
    'Critical Care',
    'ICU',
  ];
  final _priorities = const ['Green', 'Yellow', 'Orange', 'Red'];
  final _patientStatuses = const [
    'On Transit',
    'Arrived',
    'Waiting',
    'Under Treatment',
    'Transferred',
  ];

  @override
  void dispose() {
    _patientController.dispose();
    _symptomsController.dispose();
    _heartRateController.dispose();
    _oxygenController.dispose();
    _bloodPressureController.dispose();
    _respiratoryRateController.dispose();
    _temperatureController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<TriageAppState>();
    _syncControllers(state.draft);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Case'),
        actions: [
          if (state.offlineQueue.isNotEmpty)
            TextButton.icon(
              onPressed: state.isLoading
                  ? null
                  : () => context.read<TriageAppState>().flushOfflineQueue(),
              icon: const Icon(Icons.cloud_upload_outlined),
              label: Text('${state.offlineQueue.length} queued'),
            ),
          IconButton(
            onPressed: () => context.read<TriageAppState>().logout(),
            icon: const Icon(Icons.logout),
            tooltip: 'Log out',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          if (state.assignmentNotificationMessage != null)
            _AssignmentNotificationBanner(
              message: state.assignmentNotificationMessage!,
              caseResult: state.assignmentNotificationCase,
              onDismiss: () => context
                  .read<TriageAppState>()
                  .clearAssignmentNotification(),
              onOpen: state.assignmentNotificationCase == null
                  ? null
                  : () => _openAssignmentNotification(
                        context,
                        state.assignmentNotificationCase!,
                      ),
            ),
          SectionCard(
            title: 'Voice Capture',
            trailing: state.isListening
                ? const Chip(label: Text('Listening'))
                : const Chip(label: Text('Ready')),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                FilledButton.icon(
                  onPressed: state.isListening
                      ? () => context.read<TriageAppState>().stopVoiceCapture()
                      : () => context.read<TriageAppState>().startVoiceCapture(),
                  icon: Icon(state.isListening ? Icons.stop : Icons.mic),
                  label: Text(state.isListening ? 'Stop listening' : 'Tap to Speak'),
                ),
                const SizedBox(height: 10),
                Text(
                  state.draft.transcript.isEmpty
                      ? 'Voice transcript will appear here and auto-fill the editable fields below.'
                      : state.draft.transcript,
                ),
              ],
            ),
          ),
          SectionCard(
            title: 'Detected Values',
            child: Column(
              children: [
                if (state.draft.isOxygenMissing)
                  const FieldWarning(
                    message: 'Oxygen level missing. Capture SpO2 if available.',
                    isCritical: true,
                  ),
                if (state.draft.isVitalsSparse) ...[
                  const SizedBox(height: 8),
                  const FieldWarning(
                    message: 'Vitals are sparse. Partial submission is allowed.',
                  ),
                ],
                const SizedBox(height: 12),
                TextField(
                  controller: _patientController,
                  decoration: const InputDecoration(labelText: 'Patient name'),
                  onChanged: (value) => _update((draft) => draft.patientName = value),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _symptomsController,
                  minLines: 3,
                  maxLines: 5,
                  decoration: const InputDecoration(labelText: 'Symptoms'),
                  onChanged: (value) =>
                      _update((draft) => draft.symptomsSummary = value),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _heartRateController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Heart rate'),
                        onChanged: (value) => _update(
                          (draft) => draft.heartRate = int.tryParse(value),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _oxygenController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Oxygen %'),
                        onChanged: (value) => _update(
                          (draft) => draft.oxygenLevel = int.tryParse(value),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _bloodPressureController,
                        decoration: const InputDecoration(labelText: 'Blood pressure'),
                        onChanged: (value) =>
                            _update((draft) => draft.bloodPressure = value),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _respiratoryRateController,
                        keyboardType: TextInputType.number,
                        decoration:
                            const InputDecoration(labelText: 'Respiratory rate'),
                        onChanged: (value) => _update(
                          (draft) => draft.respiratoryRate = int.tryParse(value),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _temperatureController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Temp C'),
                        onChanged: (value) => _update(
                          (draft) => draft.temperature = double.tryParse(value),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        isExpanded: true,
                        value: state.draft.consciousnessLevel,
                        decoration:
                            const InputDecoration(labelText: 'Consciousness'),
                        items: _consciousnessLevels
                            .map((item) => DropdownMenuItem(
                                  value: item,
                                  child: Text(item),
                                ))
                            .toList(),
                        onChanged: (value) => _update(
                          (draft) => draft.consciousnessLevel =
                              value ?? draft.consciousnessLevel,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          SectionCard(
            title: 'Triage Routing',
            child: Column(
              children: [
                DropdownButtonFormField<String>(
                  isExpanded: true,
                  value: state.draft.severity,
                  decoration: const InputDecoration(labelText: 'Priority'),
                  items: _priorities
                      .map((item) => DropdownMenuItem(value: item, child: Text(item)))
                      .toList(),
                  onChanged: (value) =>
                      _update((draft) => draft.severity = value ?? draft.severity),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  isExpanded: true,
                  value: state.draft.department,
                  decoration: const InputDecoration(labelText: 'Suggested department'),
                  items: _departments
                      .map((item) => DropdownMenuItem(value: item, child: Text(item)))
                      .toList(),
                  onChanged: (value) => _update(
                    (draft) => draft.department = value ?? draft.department,
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  isExpanded: true,
                  value: state.draft.patientStatus,
                  decoration: const InputDecoration(labelText: 'Patient Status'),
                  items: _patientStatuses
                      .map((item) => DropdownMenuItem(value: item, child: Text(item)))
                      .toList(),
                  onChanged: (value) => _update(
                    (draft) => draft.patientStatus = value ?? draft.patientStatus,
                  ),
                ),
              ],
            ),
          ),
          if (state.errorMessage != null)
            FieldWarning(message: state.errorMessage!, isCritical: true),
          if (state.noticeMessage != null)
            FieldWarning(message: state.noticeMessage!),
          const SizedBox(height: 10),
          FilledButton.icon(
            onPressed: state.isLoading ? null : () => _submit(context),
            icon: state.isLoading
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.send),
            label: const Text('Review and Submit'),
          ),
        ],
      ),
    );
  }

  Future<void> _openAssignmentNotification(
    BuildContext context,
    SubmittedCase caseResult,
  ) async {
    context.read<TriageAppState>().clearAssignmentNotification();
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => CaseStatusScreen(caseResult: caseResult),
      ),
    );
  }

  void _syncControllers(TriageCaseDraft draft) {
    _setText(_patientController, draft.patientName);
    _setText(_symptomsController, draft.symptomsSummary);
    _setText(_heartRateController, draft.heartRate?.toString() ?? '');
    _setText(_oxygenController, draft.oxygenLevel?.toString() ?? '');
    _setText(_bloodPressureController, draft.bloodPressure);
    _setText(_respiratoryRateController, draft.respiratoryRate?.toString() ?? '');
    _setText(_temperatureController, draft.temperature?.toString() ?? '');
  }

  void _setText(TextEditingController controller, String value) {
    if (controller.text == value) {
      return;
    }
    controller.value = TextEditingValue(
      text: value,
      selection: TextSelection.collapsed(offset: value.length),
    );
  }

  void _update(void Function(TriageCaseDraft draft) change) {
    context.read<TriageAppState>().updateDraft(change);
  }

  Future<void> _submit(BuildContext context) async {
    final state = context.read<TriageAppState>();
    await state.submitDraft();
    if (!context.mounted || state.lastSubmittedCase == null) {
      return;
    }
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => CaseStatusScreen(caseResult: state.lastSubmittedCase!),
      ),
    );
  }
}

class _AssignmentNotificationBanner extends StatelessWidget {
  const _AssignmentNotificationBanner({
    required this.message,
    required this.onDismiss,
    this.caseResult,
    this.onOpen,
  });

  final String message;
  final SubmittedCase? caseResult;
  final VoidCallback onDismiss;
  final VoidCallback? onOpen;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Card(
      elevation: 0,
      color: colors.tertiaryContainer.withValues(alpha: 0.45),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: colors.tertiary.withValues(alpha: 0.45)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 8, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.notifications_active_outlined, color: colors.tertiary),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Case assigned',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(message),
                      if (caseResult != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          '${caseResult!.patientName} / ${caseResult!.department}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ],
                  ),
                ),
                IconButton(
                  onPressed: onDismiss,
                  icon: const Icon(Icons.close),
                  tooltip: 'Dismiss',
                ),
              ],
            ),
            if (onOpen != null)
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: onOpen,
                  icon: const Icon(Icons.open_in_new),
                  label: const Text('View case'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
