const ADJECTIVES = [
  '勇敢的', '焦虑的', '快乐的', '迷茫的', '清醒的', '困倦的', '神秘的', '热情的', '冷酷的', '温柔的',
  '暴躁的', '机智的', '呆萌的', '傲娇的', '佛系的', '内卷的', '躺平的', '幸运的', '倒霉的', '努力的'
]

const NOUNS = [
  '哈士奇', '考研狗', '橘猫', '水豚', '熊猫', '企鹅', '水獭', '海豹', '柴犬', '萨摩耶',
  '布偶', '柯基', '蓝猫', '仓鼠', '树懒', '刺猬', '羊驼', '水母', '海豚', '白熊'
]

const COLORS = [
  '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF',
  '#A0C4FF', '#BDB2FF', '#FFC6FF', '#FDFFB6', '#CAFFBF'
]

export function generateIdentity() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  
  return {
    name: `${adj}${noun}`,
    avatar: color // 简单起见，头像使用随机纯色背景
  }
}
