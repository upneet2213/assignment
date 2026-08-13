"use client";
import { login } from "@/app/actions/auth";
import { LoginFormSchema } from "@/lib/definitions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { useActionState } from "react";

const Login = () => {
  const [lastResult, action, isPending] = useActionState(login, undefined);

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: LoginFormSchema,
      });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <div className="max-w-100 mx-auto">
      <h1 className="text-2xl font-bold mb-4">Log In</h1>

      <form
        id={form.id}
        onSubmit={form.onSubmit}
        action={action}
        noValidate
        className="space-y-4"
      >
        <div>
          <Label htmlFor={fields.email.id}>Email</Label>
          <Input
            type="email"
            key={fields.email.key}
            name={fields.email.name}
            defaultValue={fields.email.initialValue}
          />
          {fields.email.errors && (
            <p className="text-red-500">{fields.email.errors}</p>
          )}
        </div>

        <div>
          <Label htmlFor={fields.password.id}>Password</Label>
          <Input
            type="password"
            key={fields.password.key}
            name={fields.password.name}
          />
          {fields.password.errors && (
            <p className="text-red-500">{fields.password.errors}</p>
          )}
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Logging in..." : "Log in"}
        </Button>
      </form>
    </div>
  );
};
export default Login;
