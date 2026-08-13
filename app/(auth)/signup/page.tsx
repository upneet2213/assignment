"use client";
import { signup } from "@/app/actions/auth";
import { useForm } from "@conform-to/react";
import { useActionState } from "react";
import { parseWithZod } from "@conform-to/zod/v4";
import { SignupFormSchema } from "@/lib/definitions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SignupPage = () => {
  const [lastResult, action, isPending] = useActionState(signup, undefined);

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: SignupFormSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <div className="max-w-100 mx-auto">
      <h1 className="text-2xl font-bold mb-4">Sign Up</h1>

      <form
        id={form.id}
        onSubmit={form.onSubmit}
        action={action}
        noValidate
        className="space-y-4"
      >
        <div>
          <Label htmlFor={fields.name.id}>Name</Label>
          <Input
            type="text"
            key={fields.name.key}
            name={fields.name.name}
            defaultValue={fields.name.initialValue}
          />
          {fields.name.errors && (
            <p className="text-red-500">{fields.name.errors}</p>
          )}
        </div>

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
          {isPending ? "Signing up..." : "Sign up"}
        </Button>
      </form>
    </div>
  );
};
export default SignupPage;
