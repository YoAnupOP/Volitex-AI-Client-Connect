import { redirect } from "next/navigation";
export default function DeprecatedLoginPage() { redirect("/access-link?state=required"); }
