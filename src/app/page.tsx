import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/access-link?state=required");
}
