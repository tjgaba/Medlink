import 'package:flutter/material.dart';

import '../models/triage_case.dart';

class CaseStatusScreen extends StatelessWidget {
  const CaseStatusScreen({
    super.key,
    required this.caseResult,
  });

  final SubmittedCase caseResult;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Case Status')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            elevation: 0,
            color: _priorityColor(caseResult.priority).withValues(alpha: 0.10),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
              side: BorderSide(color: _priorityColor(caseResult.priority)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    caseResult.displayCode,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(caseResult.patientName),
                  const SizedBox(height: 16),
                  _StatusRow(label: 'Priority', value: caseResult.priority),
                  _StatusRow(
                    label: 'Suggested department',
                    value: caseResult.department,
                  ),
                  _StatusRow(label: 'Allocation', value: caseResult.allocation),
                  _StatusRow(
                    label: 'Patient Status',
                    value: caseResult.patientStatus,
                  ),
                  _StatusRow(label: 'Case Status', value: caseResult.caseStatus),
                  if (caseResult.hasAssignedStaff)
                    _StatusRow(
                      label: 'Assigned staff',
                      value: caseResult.assignedStaffName,
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.add),
            label: const Text('Capture another case'),
          ),
        ],
      ),
    );
  }

  Color _priorityColor(String priority) {
    return switch (priority) {
      'High' => Colors.red.shade700,
      'Medium' => Colors.orange.shade800,
      _ => Colors.green.shade700,
    };
  }
}

class _StatusRow extends StatelessWidget {
  const _StatusRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 150,
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
