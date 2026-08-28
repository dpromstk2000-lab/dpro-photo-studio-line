(function (global) {
  "use strict";
  const STEPS = [
    { step: 1, page: "index.html", title: "撮影プラン", body: "カテゴリーから撮影内容に近いプランを選びます。選んだプランによって、後の予約可能日時や案内内容が変わります。", target: 'section[data-step="1"]', fallback: "#planGrid" },
    { step: 2, page: "index.html", title: "オプション・担当", body: "必要な撮影オプションとカメラマンを確認します。どちらも任意項目なので、必要なものだけ選べます。", target: 'section[data-step="2"]', fallback: "#optionGrid" },
    { step: 3, page: "index.html", title: "撮影日時", body: "撮影日を選ぶと、その日に予約できる30分単位の空き時間が表示されます。", target: 'section[data-step="3"]', fallback: "#reservationDate" },
    { step: 4, page: "index.html", title: "お客様情報", body: "予約に必要な連絡先を入力する画面です。公開デモでは実在する氏名・電話番号・住所などを入力せず、必ず架空情報を使用してください。", target: 'section[data-step="4"]', fallback: "#customerName" },
    { step: 5, page: "index.html", title: "撮影対象者", body: "人物・お子さま・乳幼児・ペットなど、撮影する対象を登録します。複数いる場合は追加できます。", target: 'section[data-step="5"]', fallback: "#subjectsList" },
    { step: 6, page: "index.html", title: "事前ヒアリング", body: "撮影目的、希望する雰囲気やカット、衣装、配慮事項などを事前に共有する画面です。", target: 'section[data-step="6"]', fallback: "#shootingPurpose" },
    { step: 7, page: "index.html", title: "内容確認", body: "予約内容の最終確認画面です。チュートリアルは同意チェックや予約送信を自動では行いません。", target: 'section[data-step="7"]', fallback: "#summaryList", next: "owner-ipad.html?demo=1&tutorial=1" },
    { step: 8, page: "owner-ipad.html", title: "当日受付・撮影進行", body: "来店待ち → 受付・撮影準備 → 撮影 → 会計・案内 → 完了の流れを、受付iPadのレーンで確認します。", target: ".lanes", fallback: "#authGate", next: "member.html?demo=1&tutorial=1", prev: "index.html?demo=1&tutorial=1" },
    { step: 9, page: "member.html", title: "写真セレクト・納品", body: "お客様マイページでは、予約・撮影前案内・写真セレクト・納品・再注文相談をタブでまとめて確認できます。", target: "nav.tabs-wrap", fallback: "#section-selection", next: "owner.html?demo=1&tutorial=1", prev: "owner-ipad.html?demo=1&tutorial=1" },
    { step: 10, page: "owner.html", title: "撮影カルテ・再注文管理", body: "オーナーPCでは、予約・ヒアリング、当日カルテ、写真セレクト、納品、タスク、再注文・アルバム相談までを一つの管理画面で扱います。", target: ".side-nav", fallback: "#authGate", prev: "member.html?demo=1&tutorial=1", complete: true }
  ];
  global.DPRO_PHOTO_TUTORIAL_V11 = Object.freeze({
    version: "DPRO-TUTORIAL-PHOTO-V1.1-R4-20260828",
    standard: "V1.1",
    namespace: "dpro_tutorial_photo_v1_1",
    first10Count: 10,
    steps: Object.freeze(STEPS.map(Object.freeze))
  });
})(window);
