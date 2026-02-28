plugins {
    id("com.android.application")
}

android {
    namespace = "com.ceim.roboteyes"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.ceim.roboteyes"
        minSdk = 24
        targetSdk = 34
        versionCode = 3
        versionName = "1.2"

        ndk {
            abiFilters += listOf("armeabi-v7a", "arm64-v8a")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}


configurations.all {
    resolutionStrategy {
        force("org.jetbrains.kotlin:kotlin-stdlib:1.8.22")
        force("org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.8.22")
        force("org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.8.22")
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.webkit:webkit:1.8.0")

    // CameraX
    implementation("androidx.camera:camera-core:1.3.1")
    implementation("androidx.camera:camera-camera2:1.3.1")
    implementation("androidx.camera:camera-lifecycle:1.3.1")

    // ML Kit Face Detection (bundled — no Play Services required)
    implementation("com.google.mlkit:face-detection:16.1.6")
}
