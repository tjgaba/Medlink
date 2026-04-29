import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:paramedic_triage_app/screens/login_screen.dart';
import 'package:paramedic_triage_app/state/triage_app_state.dart';
import 'package:provider/provider.dart';

void main() {
  testWidgets('login screen renders the paramedic sign-in form', (tester) async {
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => TriageAppState(),
        child: const MaterialApp(home: LoginScreen()),
      ),
    );

    expect(find.text('Paramedic Triage'), findsOneWidget);
    expect(find.text('Capture fast, submit structured, hand over cleanly.'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'Username'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'Password'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Sign in'), findsOneWidget);
  });
}
