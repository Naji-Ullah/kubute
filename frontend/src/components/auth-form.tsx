"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/button";
import { Field, FormError, type FieldProps } from "@/components/field";
import { toFormErrors, type FormErrors } from "@/lib/api";
import { clientApi } from "@/lib/api.client";

const FIELDS = {
  name: { name: "name", label: "Name", autoComplete: "name", maxLength: 100 },
  username: {
    name: "username",
    label: "Username",
    autoComplete: "username",
    autoCapitalize: "none",
    spellCheck: false,
    maxLength: 150,
  },
  nickname: { name: "nickname", label: "Nickname", autoComplete: "nickname", maxLength: 30 },
  password: { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
  newPassword: { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
} satisfies Record<string, Omit<FieldProps, "error">>;

type AuthFormProps = {
  endpoint: string;
  fields: (keyof typeof FIELDS)[];
  submitLabel: string;
};

export function AuthForm({ endpoint, fields, submitLabel }: AuthFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    startTransition(async () => {
      try {
        await clientApi(endpoint, { method: "POST", body });
        router.replace("/");
        router.refresh();
      } catch (error) {
        setErrors(toFormErrors(error));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormError message={errors.form} />
      {fields.map((key) => {
        const field = FIELDS[key];
        return <Field key={key} required error={errors.fields[field.name]} {...field} />;
      })}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Please wait…" : submitLabel}
      </Button>
    </form>
  );
}
