import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'screens/create_case_screen.dart';
import 'screens/login_screen.dart';
import 'state/triage_app_state.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ParamedicTriageApp());
}

class ParamedicTriageApp extends StatelessWidget {
  const ParamedicTriageApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => TriageAppState()..restoreSession(),
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'Paramedic Triage',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xff116466),
            brightness: Brightness.light,
          ),
          inputDecorationTheme: const InputDecorationTheme(
            border: OutlineInputBorder(),
          ),
          useMaterial3: true,
        ),
        home: const AuthGate(),
      ),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<TriageAppState>();

    if (state.isRestoringSession) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return state.isAuthenticated
        ? const CreateCaseScreen()
        : const LoginScreen();
  }
}
