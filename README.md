# Bengkel App

Aplikasi React + Vite untuk manajemen inventaris suku cadang, menggunakan Firebase untuk autentikasi dan database.

### 1. Clone & Install
```bash
npm install
```

### 2. Setup Firebase (Wajib)

#### a. Buat Proyek Firebase
- Buka [Firebase Console](https://console.firebase.google.com/)
- Klik "Add project" dan ikuti wizard
- Aktifkan **Firestore Database**
- Aktifkan **Authentication** > **Anonymous authentication**

#### b. Dapatkan Konfigurasi Firebase
- Di Firebase Console, klik ikon gear (⚙️) di samping "Project Overview"
- Pilih "Project settings"
- Scroll ke bagian "Your apps" dan klik ikon web (</>)
- Daftarkan aplikasi dan salin objek konfigurasi

#### c. Buat File `.env`
- Di root project, buat file bernama `.env`:

```env
VITE_FIREBASE_API_KEY=api_key_anda
VITE_FIREBASE_AUTH_DOMAIN=project_id_anda.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=project_id_anda
VITE_FIREBASE_STORAGE_BUCKET=project_id_anda.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=messaging_sender_id_anda
VITE_FIREBASE_APP_ID=app_id_anda
```

- Ganti nilai di atas dengan konfigurasi Firebase Anda.

#### d. Atur Rules Firestore
- Di Firebase Console > Firestore Database > Rules, atur:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/users/{userId}/spareParts/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🛠️ Mode Pengembangan

Jalankan server development Vite (default di `localhost:5173`):
```bash
npm run dev
```
- Buka [http://localhost:5173](http://localhost:5173) di browser Anda.
- Hot reload aktif secara otomatis.

---

## 📦 Build Produksi

Build aplikasi untuk produksi:
```bash
npm run build
```
- File statis akan dihasilkan di folder `dist/`.

### Preview Build Produksi Secara Lokal
```bash
npm run preview
```
- Membuka server lokal untuk melihat hasil build.

### Deploy File Statis
- Anda bisa melayani folder `dist/` dengan server statis apapun (misal: Firebase Hosting, XAMPP/Apache, nginx).
- **Catatan:** Aplikasi tetap menggunakan Firebase untuk backend (database, autentikasi).

#### Firebase Hosting (Direkomendasikan)
- Install Firebase CLI: `npm install -g firebase-tools`
- Login: `firebase login`
- Deploy: `firebase deploy`