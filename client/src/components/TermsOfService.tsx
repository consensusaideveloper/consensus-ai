import { Brain, FileText } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { AccountMenu } from "./AccountMenu";

export function TermsOfService() {
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
                {t("termsOfService.closeWindow")}
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
            <FileText className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">利用規約</h1>
          </div>

          <div className="prose prose-blue max-w-none">
            <p className="text-gray-600 mb-6">最終更新日：2024年6月26日</p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                第1条（適用）
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                本利用規約（以下「本規約」といいます。）は、ConsensusAI（以下「当サービス」といいます。）の利用条件を定めるものです。
                ユーザーの皆さま（以下「ユーザー」といいます。）には、本規約に従って、当サービスをご利用いただきます。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                第2条（利用登録）
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                当サービスにおいて、登録希望者が当サービス所定の方法によって利用登録を申請し、
                当サービスがこれを承認することによって、利用登録が完了するものとします。
              </p>
              <p className="text-gray-700 leading-relaxed">
                当サービスは、利用登録の申請者に以下の事由があると判断した場合、
                利用登録の申請を承認しないことがあり、その理由については一切の開示義務を負わないものとします。
              </p>
              <ul className="list-disc list-inside text-gray-700 mt-2 ml-4">
                <li>利用登録の申請に際して虚偽の事項を届け出た場合</li>
                <li>本規約に違反したことがある者からの申請である場合</li>
                <li>その他、当サービスが利用登録を相当でないと判断した場合</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                第3条（ユーザーIDおよびパスワードの管理）
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                ユーザーは、自己の責任において、当サービスのユーザーIDおよびパスワードを適切に管理するものとします。
              </p>
              <p className="text-gray-700 leading-relaxed">
                ユーザーは、いかなる場合にも、ユーザーIDおよびパスワードを第三者に譲渡または貸与し、
                もしくは第三者と共用することはできません。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                第4条（禁止事項）
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                ユーザーは、当サービスの利用にあたり、以下の行為をしてはなりません。
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>法令または公序良俗に違反する行為</li>
                <li>犯罪行為に関連する行為</li>
                <li>
                  当サービスの内容等、当サービスに含まれる著作権、商標権ほか知的財産権を侵害する行為
                </li>
                <li>
                  当サービス、ほかのユーザー、またはその他第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為
                </li>
                <li>当サービスによって得られた情報を商業的に利用する行為</li>
                <li>当サービスの運営を妨害するおそれのある行為</li>
                <li>不正アクセスをし、またはこれを試みる行為</li>
                <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
                <li>不正な目的を持って当サービスを利用する行為</li>
                <li>
                  当サービスの他のユーザーまたはその他の第三者に不利益、損害、不快感を与える行為
                </li>
                <li>その他当サービスが不適切と判断する行為</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                第5条（本サービスの提供の停止等）
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                当サービスは、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>
                  本サービスにかかるコンピュータシステムの保守点検または更新を行う場合
                </li>
                <li>
                  地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合
                </li>
                <li>コンピュータまたは通信回線等が事故により停止した場合</li>
                <li>
                  その他、当サービスが本サービスの提供が困難と判断した場合
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                第6条（著作権）
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                ユーザーは、自ら著作権等の必要な知的財産権を有するか、または必要な権利者の許諾を得た文章、画像や映像等の情報に関してのみ、本サービスを利用し、投稿ないしアップロードすることができるものとします。
              </p>
              <p className="text-gray-700 leading-relaxed">
                ユーザーが本サービスを利用して投稿ないしアップロードした文章、画像、映像等の著作権については、当該ユーザーその他既存の権利者に留保されるものとします。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                第7条（利用制限および登録抹消）
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                当サービスは、ユーザーが以下のいずれかに該当する場合には、事前の通知なく、投稿データを削除し、ユーザーに対して本サービスの全部もしくは一部の利用を制限しまたはユーザーとしての登録を抹消することができるものとします。
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>本規約のいずれかの条項に違反した場合</li>
                <li>登録事項に虚偽の事実があることが判明した場合</li>
                <li>料金等の支払債務の不履行があった場合</li>
                <li>当サービスからの連絡に対し、一定期間返答がない場合</li>
                <li>
                  本サービスについて、最後の利用から一定期間利用がない場合
                </li>
                <li>
                  その他、当サービスが本サービスの利用を適当でないと判断した場合
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                第8条（免責事項）
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                当サービスは、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。
              </p>
              <p className="text-gray-700 leading-relaxed">
                当サービスは、本サービスに起因してユーザーに生じたあらゆる損害について一切の責任を負いません。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                第9条（サービス内容の変更等）
              </h2>
              <p className="text-gray-700 leading-relaxed">
                当サービスは、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                第10条（利用規約の変更）
              </h2>
              <p className="text-gray-700 leading-relaxed">
                当サービスは以下の場合には、ユーザーの個別の同意を要せず、本規約を変更することができるものとします。
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mt-2">
                <li>本規約の変更がユーザーの一般の利益に適合するとき。</li>
                <li>
                  本規約の変更が本サービス利用契約の目的に反せず、かつ、変更の必要性、変更後の内容の相当性その他の変更に係る事情に照らして合理的なものであるとき。
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                第11条（個人情報の取扱い）
              </h2>
              <p className="text-gray-700 leading-relaxed">
                当サービスは、本サービスの利用によって取得する個人情報については、当サービス「プライバシーポリシー」に従い適切に取り扱うものとします。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                第12条（準拠法・裁判管轄）
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                本規約の解釈にあたっては、日本法を準拠法とします。
              </p>
              <p className="text-gray-700 leading-relaxed">
                本サービスに関して紛争が生じた場合には、当サービスの本店所在地を管轄する裁判所を専属的合意管轄とします。
              </p>
            </section>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
              <p className="text-blue-800 text-sm">
                本規約についてご質問がございましたら、お問い合わせフォームよりご連絡ください。
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
