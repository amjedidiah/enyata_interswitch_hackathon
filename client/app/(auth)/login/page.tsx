import LoginForm from "@/components/login/LoginForm";
import AuthContainer from "@/components/shared/AuthContainer";

function LoginPage() {
  return (
    <AuthContainer
      title="Welcome back"
      subTitle="Sign in to your AjoFlow account."
      Form={LoginForm}
      inquiry="No account"
      action={{ href: "/register", text: "Create one" }}
    />
  );
}

export default LoginPage;
