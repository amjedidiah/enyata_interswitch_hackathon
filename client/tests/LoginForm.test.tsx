import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import consola from "consola";

// ─── Mock externals before importing the component ──────────────────────────

const pushFn = mock(() => {});
const setAuthFn = mock(() => {});
const toastErrorFn = mock(() => {});

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: pushFn }),
  useSearchParams: () => new URLSearchParams(),
}));

mock.module("sonner", () => ({
  toast: { error: toastErrorFn, success: () => {} },
}));

mock.module("@/contexts/AuthContext", () => ({
  useAuthContext: () => ({
    user: null,
    hasToken: false,
    isInitialized: true,
    setAuth: setAuthFn,
    clearAuth: () => {},
  }),
}));

const createSuccessLoginMock = () =>
  mock((...args: unknown[]) => {
    consola.debug("loginMock", args);
    return Promise.resolve({
      data: { token: "jwt", user: { id: "1", name: "Test", email: "t@t.com" } },
    });
  });

let loginMock = createSuccessLoginMock();

mock.module("@/lib/api", () => ({
  authApi: {
    login: (...args: unknown[]) => loginMock(...args),
  },
}));

import LoginForm from "@/components/login/LoginForm";

afterEach(cleanup);

beforeEach(() => {
  pushFn.mockClear();
  setAuthFn.mockClear();
  toastErrorFn.mockClear();
  loginMock = createSuccessLoginMock();
});

describe("LoginForm", () => {
  it("renders email and password fields", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
  });

  it("renders the sign in button", () => {
    render(<LoginForm />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDefined();
  });

  it("toggles password visibility", () => {
    render(<LoginForm />);
    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    const toggleBtn = screen.getByLabelText("Show password");
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe("text");
  });

  it("calls login API and redirects on success", async () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "MyP@ss123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(loginMock).toHaveBeenCalled());
    await waitFor(() => expect(setAuthFn).toHaveBeenCalled());
    await waitFor(() => expect(pushFn).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows error toast on 401", async () => {
    loginMock = mock(() =>
      Promise.reject(
        Object.assign(new Error("Request failed"), {
          response: { status: 401, data: {} },
        }) as Error & {
          response: { status: number; data: Record<string, unknown> };
        },
      ),
    );

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(toastErrorFn).toHaveBeenCalledWith(
        expect.stringContaining("Incorrect email or password"),
      );
    });
  });
});
