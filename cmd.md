eas build --platform android --profile preview
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      }
    }
  }
}



eas build --platform android --profile production
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}