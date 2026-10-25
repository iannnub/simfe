import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="SIMPRESMA - Sistem Manajemen Prestasi Mahasiswa Fakultas Ilmu Komputer Universitas Jember"
        description=""
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
