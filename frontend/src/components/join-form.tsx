"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/button";
import { Field } from "@/components/field";

const CODE_LENGTH = 6;

export function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(`/play/${code}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        label="Game code"
        name="code"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        required
        minLength={CODE_LENGTH}
        maxLength={CODE_LENGTH}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
      />
      <Button type="submit" className="w-full">
        Join
      </Button>
    </form>
  );
}
