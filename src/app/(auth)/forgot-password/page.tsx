import { redirect } from "next/navigation";
export default function DeprecatedPasswordPage() { redirect("/access-link?state=required"); }
