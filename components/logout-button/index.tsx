"use client";
import { logout } from "@/app/actions/auth";
import { Button } from "../ui/button";

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit">Log out</Button>
    </form>
  );
}
