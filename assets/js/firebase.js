// Firebase initialization for PackPal
// Replace firebaseConfig with your project's config values
// See: https://console.firebase.google.com/ → Project settings → SDK setup

window.PackPal = window.PackPal || {};

(function(){
    const firebaseConfig = {
        apiKey: "AIzaSyDZzOuAatPQp2uQfW7weciNE3vjqJvh_QI",
        authDomain: "packpal-9ba4f.firebaseapp.com",
        databaseURL: "https://packpal-9ba4f-default-rtdb.firebaseio.com",
        projectId: "packpal-9ba4f",
        storageBucket: "packpal-9ba4f.firebasestorage.app",
        messagingSenderId: "283455770797",
        appId: "1:283455770797:web:30894657b4ceac51833624",
        measurementId: "G-WMC4JHE2C0"
      };

    // Guard against multiple inits
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    PackPal.firebase = {
        app: firebase.app(),
        auth: firebase.auth(),
        db: firebase.database(),
    };
})();


