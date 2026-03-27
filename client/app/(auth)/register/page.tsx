import RegisterForm from "@/components/register/RegisterForm";
import AuthContainer from "@/components/shared/AuthContainer";

function RegisterPage() {
  return (
    <AuthContainer
      title="Create your account"
      subTitle="Join a savings circle in minutes."
      Form={RegisterForm}
      inquiry="Already have an account"
      action={{ href: "/login", text: "Login" }}
    />
  );
}

export default RegisterPage;
