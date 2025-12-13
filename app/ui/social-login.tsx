import { signIn } from '@/auth'; // 引入我们导出的 signIn
import { Button } from './button'; // 复用你的 Button 组件

export default function SocialLogin() {
  return (
    <div className="flex flex-col gap-2 mt-4">
      {/* GitHub 登录 */}
      <form
        action={async () => {
          "use server"; // 这是一个内联 Server Action
          await signIn("github", { redirectTo: "/dashboard" });
        }}
      >
        <Button className="w-full bg-gray-800 hover:bg-gray-700 flex justify-center items-center gap-2">
          {/* 这里可以放 GitHub 图标 */}
          <span>Sign in with GitHub</span>
        </Button>
      </form>
    </div>
  );
}