import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="SIMPRESMA - Sistem Manajemen Prestasi Mahasiswa Fakultas Ilmu Komputer Universitas Jember"
        description=""
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
