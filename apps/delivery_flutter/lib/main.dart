import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const apiBase = String.fromEnvironment('API_URL', defaultValue: 'http://127.0.0.1:4000/api/v1');
const tenant = String.fromEnvironment('TENANT', defaultValue: 'demo');

void main() => runApp(const DriverApp());

class DriverApp extends StatelessWidget {
  const DriverApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OmniCommerce Driver',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0F172A),
          primary: const Color(0xFFC9A227),
        ),
        useMaterial3: true,
      ),
      home: const LoginScreen(),
    );
  }
}

class Api {
  static Future<String?> token() async {
    final p = await SharedPreferences.getInstance();
    return p.getString('token');
  }

  static Future<Map<String, dynamic>> post(String path, Map body, {bool auth = false}) async {
    final headers = {
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenant,
    };
    if (auth) {
      final t = await token();
      if (t != null) headers['Authorization'] = 'Bearer $t';
    }
    final res = await http.post(Uri.parse('$apiBase$path'), headers: headers, body: jsonEncode(body));
    final decoded = jsonDecode(res.body);
    if (decoded is Map<String, dynamic>) return decoded;
    return {'data': decoded};
  }

  static Future<dynamic> get(String path) async {
    final t = await token();
    final res = await http.get(Uri.parse('$apiBase$path'), headers: {
      'X-Tenant-ID': tenant,
      if (t != null) 'Authorization': 'Bearer $t',
    });
    return jsonDecode(res.body);
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final email = TextEditingController(text: 'driver@demo.local');
  final password = TextEditingController(text: 'driver123');
  String? error;

  Future<void> login() async {
    try {
      final data = await Api.post('/auth/login', {'email': email.text, 'password': password.text});
      final token = data['accessToken'] as String?;
      if (token == null) {
        setState(() => error = data['message']?.toString() ?? 'Login failed');
        return;
      }
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', token);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const JobsScreen()));
    } catch (e) {
      setState(() => error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Driver login'),
            TextField(controller: email, decoration: const InputDecoration(labelText: 'Email')),
            TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
            if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 12),
            FilledButton(onPressed: login, child: const Text('Sign in')),
          ],
        ),
      ),
    );
  }
}

class JobsScreen extends StatefulWidget {
  const JobsScreen({super.key});
  @override
  State<JobsScreen> createState() => _JobsScreenState();
}

class _JobsScreenState extends State<JobsScreen> {
  List jobs = [];
  String? earnings;
  bool online = true;

  @override
  void initState() {
    super.initState();
    refresh();
  }

  Future<void> refresh() async {
    await Api.post('/driver/online', {'isOnline': online}, auth: true);
    await Api.post('/driver/location', {'lat': 12.97, 'lng': 77.59}, auth: true);
    final data = await Api.get('/driver/jobs?lat=12.97&lng=77.59');
    final earn = await Api.get('/driver/earnings');
    setState(() {
      jobs = data is List ? data : [];
      earnings = earn is Map ? '${earn['total']}' : '';
    });
  }

  Future<void> toggleOnline(bool value) async {
    setState(() => online = value);
    await Api.post('/driver/online', {'isOnline': value}, auth: true);
    await refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Nearby jobs · earn $earnings'),
        actions: [
          Switch(value: online, onChanged: toggleOnline),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: refresh,
        child: ListView.builder(
          itemCount: jobs.length,
          itemBuilder: (c, i) {
            final j = jobs[i] as Map;
            return ListTile(
              title: Text(j['status']?.toString() ?? ''),
              subtitle: Text('${j['id']} · ${j['distanceKm'] ?? '-'} km'),
              trailing: TextButton(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => JobDetailScreen(job: j, onChanged: refresh)),
                  );
                },
                child: const Text('Open'),
              ),
            );
          },
        ),
      ),
    );
  }
}

class JobDetailScreen extends StatelessWidget {
  const JobDetailScreen({super.key, required this.job, required this.onChanged});
  final Map job;
  final Future<void> Function() onChanged;

  Future<void> act(BuildContext context, String path, Map body) async {
    await Api.post(path, body, auth: true);
    await onChanged();
    if (context.mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final id = job['id'] as String;
    final status = job['status']?.toString() ?? '';
    return Scaffold(
      appBar: AppBar(title: Text('Job $status')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(id),
            const SizedBox(height: 16),
            if (status == 'UNASSIGNED')
              FilledButton(
                onPressed: () => act(context, '/driver/jobs/$id/accept', {}),
                child: const Text('Accept'),
              ),
            if (status == 'ACCEPTED')
              FilledButton(
                onPressed: () => act(context, '/driver/jobs/$id/advance', {'status': 'ARRIVED'}),
                child: const Text('Arrived'),
              ),
            if (status == 'ARRIVED')
              FilledButton(
                onPressed: () => act(context, '/driver/jobs/$id/advance', {'status': 'PICKED_UP'}),
                child: const Text('Picked up'),
              ),
            if (status == 'PICKED_UP')
              FilledButton(
                onPressed: () => act(context, '/driver/jobs/$id/advance', {'status': 'DELIVERED'}),
                child: const Text('Delivered'),
              ),
          ],
        ),
      ),
    );
  }
}
