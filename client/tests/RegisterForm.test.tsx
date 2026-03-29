import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { AxiosError, AxiosResponse } from "axios";
import consola from "consola";

// ─── Mock externals ─────────────────────────────────────────────────────────

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

const createSuccessRegisterMock = () =>
  mock((...args: unknown[]) => {
    consola.debug("registerMock", args);
    return Promise.resolve({
      data: {
        token: "jwt",
        user: { id: "1", name: "Amara", email: "a@test.com" },
      },
    });
  });

let registerMock = createSuccessRegisterMock();

mock.module("@/lib/api", () => ({
  authApi: {
    register: (...args: unknown[]) => registerMock(...args),
  },
}));

import RegisterForm from "@/components/register/RegisterForm";

afterEach(cleanup);

beforeEach(() => {
  pushFn.mockClear();
  setAuthFn.mockClear();
  toastErrorFn.mockClear();
  registerMock = createSuccessRegisterMock();
});

function fillForm(overrides: Record<string, string> = {}) {
  const values = {
    "Full Name": "Amara Osei",
    Email: "amara@example.com",
    "Phone Number": "+2348100000000",
    Password: "StrongP@ss1",
    "Confirm Password": "StrongP@ss1",
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), {
      target: { value },
    });
  }
}

describe("RegisterForm", () => {
  it("renders all form fields", () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText("Full Name")).toBeDefined();
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Phone Number")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByLabelText("Confirm Password")).toBeDefined();
    expect(
      screen.getByRole("button", { name: /create account/i }),
    ).toBeDefined();
  });

  it("shows error for short name", async () => {
    render(<RegisterForm />);
    fillForm({ "Full Name": "AB" });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(toastErrorFn).toHaveBeenCalledWith(
        expect.stringContaining("full name"),
      );
    });
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("shows error for invalid phone", async () => {
    render(<RegisterForm />);
    fillForm({ "Phone Number": "123" });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(toastErrorFn).toHaveBeenCalledWith(
        expect.stringContaining("valid phone number"),
      );
    });
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("shows error for weak password (no uppercase)", async () => {
    render(<RegisterForm />);
    fillForm({ Password: "weakpass@1", "Confirm Password": "weakpass@1" });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(toastErrorFn).toHaveBeenCalledWith(
        expect.stringContaining("uppercase"),
      );
    });
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("shows error for weak password (no special char)", async () => {
    render(<RegisterForm />);
    fillForm({ Password: "StrongPass1", "Confirm Password": "StrongPass1" });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(toastErrorFn).toHaveBeenCalledWith(
        expect.stringContaining("special character"),
      );
    });
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("shows error for password mismatch", async () => {
    render(<RegisterForm />);
    fillForm({ "Confirm Password": "DifferentP@ss1" });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(toastErrorFn).toHaveBeenCalledWith(
        expect.stringContaining("do not match"),
      );
    });
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("calls register API and redirects on success", async () => {
    render(<RegisterForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalled();
      expect(setAuthFn).toHaveBeenCalled();
      expect(pushFn).toHaveBeenCalledWith("/dashboard?welcome=true");
    });
  });

  it("shows error toast on 409 (duplicate email)", async () => {
    registerMock = mock(() => {
      const err = new Error("Request failed");
      // Match the shape expected from Axios errors in the form component.
      (err as unknown as AxiosError<{ message: string }>).response = {
        status: 409,
        data: { message: "Email exists" },
      } as AxiosResponse<{ message: string }>;
      return Promise.reject(err);
    });

    render(<RegisterForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(toastErrorFn).toHaveBeenCalledWith(
        expect.stringContaining("already exists"),
      );
    });
  });
});
