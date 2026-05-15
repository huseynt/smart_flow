export const firebaseErrorMessages: Record<string, string> = {
  "auth/user-not-found": "Bu email ilə istifadəçi tapılmadı",
  "auth/wrong-password": "Şifrə yanlışdır",
  "auth/email-already-in-use": "Bu email artıq istifadə olunur",
  "auth/weak-password": "Şifrə çox zəifdir (minimum 6 simvol)",
  "auth/invalid-email": "Email formatı yanlışdır",
  "auth/too-many-requests":
    "Çox sayda cəhd. Bir az sonra yenidən cəhd edin",
  "auth/network-request-failed": "Şəbəkə xətası",
  "auth/operation-not-allowed": "Bu əməliyyat icazə verilmədi",
  "auth/invalid-password": "Şifrə yanlışdır",
  "auth/user-disabled": "Bu istifadəçi deaktiv edilib",
  "auth/internal-error": "Daxili xəta. Bir az sonra yenidən cəhd edin",
};

export const getFirebaseErrorMessage = (code: string): string => {
  return (
    firebaseErrorMessages[code] ??
    "Bilinməyən xəta baş verdi. Bir az sonra yenidən cəhd edin"
  );
};
