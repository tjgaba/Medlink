import 'package:flutter/material.dart';

class FieldWarning extends StatelessWidget {
  const FieldWarning({
    super.key,
    required this.message,
    this.isCritical = false,
  });

  final String message;
  final bool isCritical;

  @override
  Widget build(BuildContext context) {
    final color = isCritical ? Colors.red.shade700 : Colors.orange.shade800;
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        border: Border.all(color: color.withValues(alpha: 0.35)),
        borderRadius: BorderRadius.circular(8),
        color: color.withValues(alpha: 0.08),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: color, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: TextStyle(color: color, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}
