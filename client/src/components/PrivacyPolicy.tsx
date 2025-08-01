import { Brain, Shield } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { AccountMenu } from "./AccountMenu";

export function PrivacyPolicy() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Brain className="h-6 w-6 text-blue-600 mr-2" />
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ConsensusAI
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.close()}
                className="text-gray-600 hover:text-gray-800 text-sm"
              >
                {t("privacyPolicy.closeWindow")}
              </button>
              <AccountMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="flex items-center mb-8">
            <Shield className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">
              プライバシーポリシー
            </h1>
          </div>

          <div className="prose prose-blue max-w-none">
            <p className="text-gray-600 mb-6">最終更新日：2024年6月26日</p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                1. はじめに
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                ConsensusAI（以下「当サービス」といいます。）は、ユーザーの個人情報の重要性を認識し、
                個人情報の保護に関する法律（個人情報保護法）を遵守し、適切な取扱いを行います。
              </p>
              <p className="text-gray-700 leading-relaxed">
                本プライバシーポリシーは、当サービスがどのような個人情報を収集し、
                どのように利用・保護するかについて説明したものです。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                2. 収集する個人情報
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                当サービスでは、以下の個人情報を収集することがあります。
              </p>

              <h3 className="text-lg font-medium text-gray-900 mb-3">
                2.1 ユーザー登録時に収集する情報
              </h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
                <li>氏名</li>
                <li>メールアドレス</li>
                <li>プロフィール画像（Googleアカウント連携時）</li>
                <li>利用目的（自治体・企業・コミュニティなど）</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-900 mb-3">
                2.2 サービス利用時に収集する情報
              </h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
                <li>プロジェクト情報（名前、説明、設定等）</li>
                <li>収集された意見・フィードバック内容</li>
                <li>AI分析結果およびトピック分類情報</li>
                <li>アクション管理情報</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-900 mb-3">
                2.3 自動的に収集される情報
              </h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>IPアドレス</li>
                <li>ブラウザの種類とバージョン</li>
                <li>アクセス日時</li>
                <li>利用状況に関するログ情報</li>
                <li>端末情報</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                3. 個人情報の利用目的
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                当サービスは、収集した個人情報を以下の目的で利用します。
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>当サービスの提供・運営</li>
                <li>ユーザーサポートおよびお問い合わせへの対応</li>
                <li>サービスの改善・新機能の開発</li>
                <li>利用規約に違反した利用の防止</li>
                <li>サービスに関する重要な通知の送信</li>
                <li>統計情報の作成（個人を特定できない形式）</li>
                <li>法令に基づく対応</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                4. 個人情報の第三者提供
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                当サービスは、以下の場合を除いて、個人情報を第三者に提供することはありません。
              </p>

              <h3 className="text-lg font-medium text-gray-900 mb-3">
                4.1 ユーザーの同意がある場合
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                ユーザーご本人の事前の同意がある場合
              </p>

              <h3 className="text-lg font-medium text-gray-900 mb-3">
                4.2 法令に基づく場合
              </h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
                <li>法令に基づき開示が求められた場合</li>
                <li>人の生命、身体または財産の保護のために必要がある場合</li>
                <li>
                  公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合
                </li>
              </ul>

              <h3 className="text-lg font-medium text-gray-900 mb-3">
                4.3 業務委託先への提供
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                サービス提供に必要な範囲で、業務委託先（AI分析サービス提供者、クラウドサービス提供者等）に個人情報を提供する場合があります。
                この場合、適切な秘密保持契約を締結し、適切な管理を求めます。
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">
                  主な業務委託先
                </h4>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• Google Firebase（認証・データベース）</li>
                  <li>• OpenAI（AI分析サービス）</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                5. 個人情報の保護措置
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                当サービスは、個人情報の安全性を確保するため、以下の措置を講じています。
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>SSL/TLS暗号化による通信の保護</li>
                <li>Firebase Authentication による安全な認証システム</li>
                <li>アクセス権限の適切な管理</li>
                <li>定期的なセキュリティ監査の実施</li>
                <li>従業員への個人情報保護に関する教育・研修</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                6. 個人情報の保存期間
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                当サービスは、個人情報を以下の期間保存します。
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>ユーザーアカウント情報：アカウント削除まで</li>
                <li>
                  プロジェクト・意見データ：プロジェクト削除まで、または法令で定められた期間
                </li>
                <li>ログ情報：6ヶ月間</li>
                <li>サポート履歴：2年間</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                7. ユーザーの権利
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                ユーザーは、自身の個人情報について以下の権利を有しています。
              </p>

              <h3 className="text-lg font-medium text-gray-900 mb-3">
                7.1 開示請求権
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                当サービスが保有する個人情報の開示を請求することができます。
              </p>

              <h3 className="text-lg font-medium text-gray-900 mb-3">
                7.2 訂正・削除請求権
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                個人情報の訂正、追加、削除を請求することができます。
              </p>

              <h3 className="text-lg font-medium text-gray-900 mb-3">
                7.3 利用停止請求権
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                個人情報の利用停止や第三者提供の停止を請求することができます。
              </p>

              <p className="text-gray-700 leading-relaxed">
                これらの請求を行いたい場合は、お問い合わせフォームよりご連絡ください。
                本人確認を行った上で、合理的な期間内に対応いたします。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                8. Cookie（クッキー）について
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                当サービスでは、ユーザーの利便性向上のためCookieを使用しています。
                Cookieは、ユーザーのブラウザに保存される小さなテキストファイルです。
              </p>

              <h3 className="text-lg font-medium text-gray-900 mb-3">
                8.1 使用目的
              </h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
                <li>ログイン状態の維持</li>
                <li>ユーザー設定の保存</li>
                <li>サービス利用状況の分析</li>
                <li>サービスの改善</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-900 mb-3">
                8.2 Cookie の拒否
              </h3>
              <p className="text-gray-700 leading-relaxed">
                ブラウザの設定によりCookieの受け入れを拒否することができますが、
                一部機能が正常に動作しない場合があります。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                9. 未成年者の個人情報について
              </h2>
              <p className="text-gray-700 leading-relaxed">
                当サービスは、13歳未満のお客様からは個人情報を収集いたしません。
                13歳以上18歳未満の方が当サービスをご利用になる場合は、
                保護者の方の同意を得た上でご利用ください。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                10. プライバシーポリシーの変更
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                当サービスは、必要に応じて本プライバシーポリシーを変更することがあります。
                重要な変更については、サービス内での通知またはメールにてお知らせいたします。
              </p>
              <p className="text-gray-700 leading-relaxed">
                変更後のプライバシーポリシーは、サービス内に掲載した時点で効力を生じるものとします。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                11. お問い合わせ
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                本プライバシーポリシーに関するお問い合わせは、以下の方法でお受けしています。
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-700 text-sm">
                  お問い合わせ方法：サービス内お問い合わせフォーム
                  <br />
                  対応時間：平日 10:00-18:00（土日祝日を除く）
                </p>
              </div>
            </section>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
              <p className="text-blue-800 text-sm">
                当サービスは、ユーザーの皆様の個人情報保護に最大限の注意を払い、
                安心・安全にご利用いただけるサービスの提供に努めております。
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
