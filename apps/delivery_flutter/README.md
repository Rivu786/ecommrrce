# Flutter driver app

This is the **product** delivery client (Expo under `apps/delivery` is unused).

```bash
cd apps/delivery_flutter
flutter pub get
flutter run \
  --dart-define=API_URL=http://YOUR_LAN_IP:4000/api/v1 \
  --dart-define=TENANT=demo
```

Login: `driver@demo.local` / `driver123`

Jobs are filtered by nearby GPS (`lat`/`lng` query). Earnings are after brand delivery commission %.
