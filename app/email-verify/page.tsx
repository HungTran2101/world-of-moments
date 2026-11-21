import MapLoading from "@/components/shared/MapLoading";
import VerificationResult from "@/components/EmailVerificationResult";

export default function EmailVerifyPage() {
  return (
    <MapLoading>
      <main className="emailVerify" aria-labelledby="email-verify-title">
        <VerificationResult />
      </main>
    </MapLoading>
  );
}
