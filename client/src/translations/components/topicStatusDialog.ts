export const topicStatusDialogTranslations = {
  ja: {
    topicStatusDialog: {
      resolved: {
        title: 'トピックを解決済みにする',
        description: 'このトピックを解決済みとして記録します',
        explanation: 'どのように解決したかを記録することで、今後の参考にできます。',
        placeholder: 'どのように解決したか、今後の参考になる情報を記録してください...',
        buttonText: '解決済みに設定'
      },
      dismissed: {
        title: 'トピックを見送りにする',
        description: 'このトピックを見送りとして記録します',
        explanation: 'なぜ見送りにしたかを記録することで、今後の判断材料にできます。',
        placeholder: 'なぜ見送りにしたか、今後の判断材料となる情報を記録してください...',
        buttonText: '見送りに設定'
      },
      reasonLabel: '理由（任意）',
      characterCount: '{count}/{max}文字',
      optionalNote: '理由を入力しなくても設定できます',
      cancel: 'キャンセル',
      topicNamePrefix: '「{name}」'
    }
  },
  en: {
    topicStatusDialog: {
      resolved: {
        title: 'Mark Topic as Resolved',
        description: 'This topic will be recorded as resolved',
        explanation: 'Recording how it was resolved will help with future reference.',
        placeholder: 'Record how it was resolved for future reference...',
        buttonText: 'Mark as Resolved'
      },
      dismissed: {
        title: 'Dismiss Topic',
        description: 'This topic will be recorded as dismissed',
        explanation: 'Recording why it was dismissed will help with future decisions.',
        placeholder: 'Record why it was dismissed for future decision-making...',
        buttonText: 'Mark as Dismissed'
      },
      reasonLabel: 'Reason (Optional)',
      characterCount: '{count}/{max} characters',
      optionalNote: 'You can proceed without entering a reason',
      cancel: 'Cancel',
      topicNamePrefix: '"{name}"'
    }
  }
};