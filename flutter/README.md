# MedLink Flutter App

The Flutter app is the mobile/field client for MedLink triage. It lets paramedics and clinical staff sign in, capture patient case details, parse spoken triage notes, submit structured vital signs, and receive workflow updates from the backend.

The React dashboard is admin-only. The Flutter app can be used by admins, doctors, nurses, and paramedics when their backend account has the correct role.

## Project Structure

```text
flutter/
  lib/
    app_config.dart
    main.dart
    models/
      triage_case.dart
    screens/
      login_screen.dart
      create_case_screen.dart
      case_status_screen.dart
    services/
      transcript_parser.dart
      triage_api_service.dart
    state/
      triage_app_state.dart
    widgets/
      section_card.dart
  test/
    widget_test.dart
  android/
  ios/
  web/
  windows/
  pubspec.yaml
  analysis_options.yaml
```

## Main Features

- JWT login against the ASP.NET Core backend.
- Structured create-case workflow for patient details, symptoms, vital signs, department, priority, and patient status.
- Speech-to-text support for faster triage capture.
- API-backed case submission so dashboard users can see new requests.
- Connectivity-aware API handling through Dio and app state.

## Configuration

The API base URL is defined in `lib/app_config.dart`:

```dart
const String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:5043/api',
);
```

Use `10.0.2.2` for Android emulator access to the host machine. Use `localhost` for Chrome or Windows desktop runs.

## Run

Install dependencies:

```powershell
flutter pub get
```

Run on Android emulator with the default backend URL:

```powershell
flutter run
```

Run on Chrome against the local backend:

```powershell
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:5043/api
```

Run on Windows desktop against the local backend:

```powershell
flutter run -d windows --dart-define=API_BASE_URL=http://localhost:5043/api
```

## Checks

```powershell
flutter test
dart format --set-exit-if-changed lib test
```

The CI workflow currently uses `flutter pub get` and `dart format --set-exit-if-changed lib test` as a quick Flutter check.
