/**
 * 무림 방치록 - 이미지 에셋 생성 스크립트 (v0.2)
 *
 * 사용법:
 *   1) .env 파일에 OPENAI_API_KEY=sk-... 추가
 *   2) npx tsx scripts/generate-assets.ts
 *
 * gpt-image-1 (DALL-E) 모델을 사용하여 게임 에셋을 생성합니다.
 * 이미 파일이 존재하면 스킵합니다.
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 파일에서 OPENAI_API_KEY 읽기
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env 파일이 없습니다. 프로젝트 루트에 .env 파일을 만들고 OPENAI_API_KEY를 설정하세요.');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    process.env[key] = value;
  }
}

loadEnv();

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ASSETS_DIR = path.resolve(__dirname, '..', 'src', 'assets');

// 공통 스타일 프리픽스
const STYLE_PREFIX =
  'Korean traditional ink wash painting style (수묵화), dark moody background, muted earthy colors with gold accents, game asset, clean edges, no text, no watermark';
const ICON_SUFFIX = 'icon style, centered, simple composition, square format';
const CHARACTER_SUFFIX = 'full body character, dynamic pose, detailed';
const BACKGROUND_SUFFIX = 'wide landscape, atmospheric, parallax-ready';

// 에셋 목록 (22개)
interface AssetEntry {
  file: string;        // src/assets/ 하위 경로
  prompt: string;      // DALL-E 프롬프트 (스타일 프리픽스 제외)
  category: 'icon' | 'character' | 'background';
  size: '1024x1024' | '1536x1024'; // 아이콘/캐릭터: 정사각, 배경: 와이드
}

const ASSETS: AssetEntry[] = [
  // 적 일러스트 (12) — v1.0
  { file: 'enemies/training_wood.png', category: 'character', size: '1024x1024',
    prompt: 'wooden training dummy, humanoid' },
  { file: 'enemies/training_iron.png', category: 'character', size: '1024x1024',
    prompt: 'iron training dummy, metallic, dented' },
  { file: 'enemies/squirrel.png', category: 'character', size: '1024x1024',
    prompt: 'wild mountain squirrel, fierce' },
  { file: 'enemies/rabbit.png', category: 'character', size: '1024x1024',
    prompt: 'wild mountain rabbit, alert' },
  { file: 'enemies/fox.png', category: 'character', size: '1024x1024',
    prompt: 'cunning mountain fox, sharp eyes' },
  { file: 'enemies/deer.png', category: 'character', size: '1024x1024',
    prompt: 'large mountain deer, antlers' },
  { file: 'enemies/boar.png', category: 'character', size: '1024x1024',
    prompt: 'wild boar, tusks, charging' },
  { file: 'enemies/wolf.png', category: 'character', size: '1024x1024',
    prompt: 'mountain wolf, snarling' },
  { file: 'enemies/bear.png', category: 'character', size: '1024x1024',
    prompt: 'massive mountain bear, roar' },
  { file: 'enemies/dangkang.png', category: 'character', size: '1024x1024',
    prompt: 'mythical Dang Kang boar, single horn jade tusks' },
  { file: 'enemies/tiger_boss.png', category: 'character', size: '1024x1024',
    prompt: 'mountain tiger king, boss aura' },

  // 무공 아이콘 (9)
  { file: 'arts/basic_sword.png', category: 'icon', size: '1024x1024',
    prompt: 'simple iron sword icon, basic martial arts, glowing faintly' },
  { file: 'arts/taichi_sword.png', category: 'icon', size: '1024x1024',
    prompt: 'taichi sword with yin-yang energy swirl, elegant blade' },
  { file: 'arts/taichi_divine.png', category: 'icon', size: '1024x1024',
    prompt: 'divine celestial sword, golden light, heavenly aura' },
  { file: 'arts/basic_palm.png', category: 'icon', size: '1024x1024',
    prompt: 'open palm with faint qi energy, basic palm strike' },
  { file: 'arts/heat_palm.png', category: 'icon', size: '1024x1024',
    prompt: 'burning palm strike, fire and heat waves emanating' },
  { file: 'arts/storm_palm.png', category: 'icon', size: '1024x1024',
    prompt: 'storm palm strike, lightning and wind vortex' },
  { file: 'arts/basic_footwork.png', category: 'icon', size: '1024x1024',
    prompt: 'simple footwork diagram, light movement trails' },
  { file: 'arts/swallow_step.png', category: 'icon', size: '1024x1024',
    prompt: 'swift swallow in flight, graceful movement trails' },
  { file: 'arts/void_step.png', category: 'icon', size: '1024x1024',
    prompt: 'figure walking on air, ethereal footsteps in void' },

  // 수련법 아이콘 (4)
  { file: 'methods/basic_breathing.png', category: 'icon', size: '1024x1024',
    prompt: 'meditation breathing exercise, faint qi flow around seated figure' },
  { file: 'methods/deep_breathing.png', category: 'icon', size: '1024x1024',
    prompt: 'deep meditation, stronger qi circulation, glowing meridians' },
  { file: 'methods/qi_condensing.png', category: 'icon', size: '1024x1024',
    prompt: 'condensing qi into core, bright energy sphere at dantian' },
  { file: 'methods/origin_heart.png', category: 'icon', size: '1024x1024',
    prompt: 'transcendent heart method, cosmic energy flowing into body, enlightenment' },

  // 챕터 배경 (3)
  { file: 'backgrounds/ch1_forest.png', category: 'background', size: '1536x1024',
    prompt: 'mountain forest bandit hideout, misty bamboo forest, wooden fortress in distance' },
  { file: 'backgrounds/ch2_mountain.png', category: 'background', size: '1536x1024',
    prompt: 'dark mountain fortress at night, rocky peaks, ominous clouds, torchlight' },
  { file: 'backgrounds/ch3_temple.png', category: 'background', size: '1536x1024',
    prompt: 'evil sect dark temple, ancient architecture, purple dark energy, foreboding atmosphere' },

  // 전투 장면 배경 (UI개편)
  { file: 'backgrounds/training_ground.png', category: 'background', size: '1536x1024',
    prompt: 'martial arts training ground, wooden dummies, stone courtyard, peaceful mountain temple backdrop, morning mist' },
  { file: 'backgrounds/mountain_forest.png', category: 'background', size: '1536x1024',
    prompt: 'wild mountain forest path, dense trees, dappled sunlight, rocky terrain, mysterious atmosphere, adventure setting' },
  { file: 'backgrounds/inn_interior.png', category: 'background', size: '1536x1024',
    prompt: 'old run-down inn interior, dim lantern light, wooden tables and benches, dusty atmosphere, suspicious figures in shadows, martial arts world' },

  // 객잔 몬스터 (10)
  { file: 'enemies/drunk_thug.png', category: 'character', size: '1024x1024',
    prompt: 'drunk ruffian thug, swaying, holding broken bottle, ragged clothes, red face' },
  { file: 'enemies/peddler.png', category: 'character', size: '1024x1024',
    prompt: 'wandering peddler merchant, carrying heavy pack, walking stick, weathered face, cunning eyes' },
  { file: 'enemies/troublemaker.png', category: 'character', size: '1024x1024',
    prompt: 'inn troublemaker brawler, muscular, rolled sleeves, aggressive stance, broken chair nearby' },
  { file: 'enemies/wanderer.png', category: 'character', size: '1024x1024',
    prompt: 'wandering swordsman ronin, tattered robes, sheathed sword, weary but dangerous, lone wolf' },
  { file: 'enemies/bounty_hunter.png', category: 'character', size: '1024x1024',
    prompt: 'bounty hunter assassin, hidden daggers, hooded cloak, sharp calculating eyes, wanted posters' },
  { file: 'enemies/ronin.png', category: 'character', size: '1024x1024',
    prompt: 'dark path ronin swordsman, black robes, heavy curved blade, menacing aura, scarred face' },
  { file: 'enemies/bandit_chief.png', category: 'character', size: '1024x1024',
    prompt: 'bandit chief, dual wielding sabers, leather armor, commanding presence, battle scars' },
  { file: 'enemies/masked_swordsman.png', category: 'character', size: '1024x1024',
    prompt: 'mysterious masked swordsman, white porcelain mask, elegant sword stance, flowing dark robes, deadly grace' },
  { file: 'enemies/innkeeper_true.png', category: 'character', size: '1024x1024',
    prompt: 'inn keeper true form, elderly but powerful martial artist, glowing fingertips, hidden master, deceptive calm appearance' },
  { file: 'enemies/bandit_leader.png', category: 'character', size: '1024x1024',
    prompt: 'bandit faction leader, massive greatsword, black wind aura, intimidating, full armor, war banner' },

  // 새외 배경
  { file: 'backgrounds/cheonsan_daebaek.png', category: 'background', size: '1536x1024',
    prompt: 'Tianshan mountain range extreme altitude, endless sea of white snow, howling blizzard winds, towering jagged peaks piercing through clouds, desolate and majestic, no signs of life, eternal ice and snow, cold blue-white palette' },

  // 흑풍채 무공 아이콘
  { file: 'arts/nokrim_bobeop.png', category: 'icon', size: '1024x1024',
    prompt: 'green forest bandit footwork art icon, swift foot movement trails, dodging silhouette, Chinese martial arts style' },

  // 흑풍채 신규 몬스터
  { file: 'enemies/heugpung_mokryeong.png', category: 'character', size: '1024x1024',
    prompt: 'black wind spirit guardian dog, fierce wooden and metal puppet body with sharp claws, glowing red eyes, dark black energy emanating, terrifying supernatural beast' },
  { file: 'enemies/sanbaram_gungsu.png', category: 'character', size: '1024x1024',
    prompt: 'mountain wind archer bandit, rugged warrior with bow and quiver, wind-swept dark robes, sharp calculating eyes, rocky mountain backdrop' },
  { file: 'enemies/nokrim_patrol_chief.png', category: 'character', size: '1024x1024',
    prompt: 'green forest alliance chief patrol inspector, muscular martial artist with green and black robes, fierce fist fighter, commanding presence, mountain bandit stronghold backdrop, stern gaze' },

  // 새외 몬스터 (천산 대맥)
  { file: 'enemies/hwahyulsa.png', category: 'character', size: '1024x1024',
    prompt: 'giant serpent snake with glowing red blood veins visible through translucent scales, fire element, high altitude snowy mountain setting, fearsome predator' },
  { file: 'enemies/eunrang.png', category: 'character', size: '1024x1024',
    prompt: 'giant silver wolf with pristine silver-white fur, massive and powerful, ethereal and ghostly elegant, high altitude snowy mountain predator, no footprints' },

  // 배화교 몬스터 (외문 일반 5종) + 문파 배경
  { file: 'enemies/baehwa_haengja.png', category: 'character', size: '1024x1024',
    prompt: 'Zoroastrian acolyte novice priest, young shaven-headed figure in plain white robes, holding sacred ember in cupped hands, humble bowing posture, faint orange fire glow, Persian sacred geometry on sleeves' },
  { file: 'enemies/baehwa_howi.png', category: 'character', size: '1024x1024',
    prompt: 'Zoroastrian temple guard warrior with long ceremonial spear, red-bordered white robes over light armor, stern protective stance, flame-engraved spearhead, watchful fierce eyes' },
  { file: 'enemies/baehwa_geombosa.png', category: 'character', size: '1024x1024',
    prompt: 'Zoroastrian sword-priest swordmaster, three-stance martial warrior, curved blade with sacred fire trailing along the edge, red and gold ritual robes, mid-motion stance change, embers falling around blade' },
  { file: 'enemies/baehwa_hwabosa.png', category: 'character', size: '1024x1024',
    prompt: 'Zoroastrian flame priestess in meditation, floating cross-legged above sacred fire altar, four-layered crimson and white ritual robes, hands forming fire mudra, column of holy flame rising behind her' },
  { file: 'enemies/baehwa_gyeongbosa.png', category: 'character', size: '1024x1024',
    prompt: 'Zoroastrian scripture scholar reciting the Avesta, elderly male priest in heavy dark-red ceremonial robes, open sacred scroll floating mid-air, glowing Avestan script symbols orbiting, stern chanting expression' },
  { file: 'enemies/baehwa_oemun_suja.png', category: 'character', size: '1024x1024',
    prompt: 'Zoroastrian outer-gate high priest (Hērbed), final tester of all outer disciples, dual-aspect boss figure caught between calm and fury — outwardly composed sacred priest with stern authoritative gaze, but with crimson embers visibly building inside his eyes and crackling around his clenched fist, layered red-gold-white ceremonial robes with one shoulder cord coming loose, sacred fire halo aura behind him with flames slowly intensifying, one hand raised in ritual blessing gesture while the other hand wreathed in violent fire ready to strike, towering imposing presence, the duality of priest and berserker in a single frame, ominous and majestic boss aura' },
  { file: 'enemies/baehwa_oemun_suja_p2.png', category: 'character', size: '1024x1024',
    prompt: 'same Zoroastrian outer-gate high priest now fully unleashed in berserker form — the priestly composure shattered, ceremonial robes torn open at the chest revealing flame-scarred skin with Zoroastrian fire tattoos, golden shoulder cords and ornaments cast aside, hair loose and smoldering at the tips with embers floating off, eyes burning with raging crimson-violet flame in place of pupils, savage feral grin baring teeth, both hands wreathed in writhing violent ember-fire ready to strike, ferocious wide berserker stance with feet planted, the sacred fire halo behind him now erupting violently outward in chaotic flame, no longer a priest but the raw avatar of Atash, terrifying and majestic phase-2 boss aura' },
  { file: 'backgrounds/baehwagyo.png', category: 'background', size: '1536x1024',
    prompt: 'Zoroastrian fire temple interior deep in ancient mountains, massive eternal sacred flame on central stone altar, stepped ritual platform, towering columns with flame reliefs, crimson banners, smoky haze lit by firelight, ominous sacred atmosphere' },

  // 희미한 성화 드롭 이미지 (잔불 7단계 + 장비 2종)
  // 저등급은 일부러 하찮고 실망스럽게 — 뽑힌 사람이 화나야 뽑기의 맛이 살아난다
  { file: 'seonghwa/ember_2.png', category: 'icon', size: '1024x1024',
    prompt: 'two pathetic tiny specks of dying ash on vast empty dark stone surface, almost completely extinguished, barely any glow, miserable and laughable, mostly empty black space, the ashes are insultingly small, comically disappointing' },
  { file: 'seonghwa/ember_5.png', category: 'icon', size: '1024x1024',
    prompt: 'five sad crumbs of grey cold ash scattered pathetically on dark stone, no flames, no glow, just dull dead ash dust, pitiful and unimpressive, empty surroundings emphasize the meagerness' },
  { file: 'seonghwa/ember_15.png', category: 'icon', size: '1024x1024',
    prompt: 'small dull pile of mostly-dead ashes with one or two faintly warm coal specks barely glowing, weak sickly orange hint, not impressive, more ash than fire, underwhelming' },
  { file: 'seonghwa/ember_40.png', category: 'icon', size: '1024x1024',
    prompt: 'decent cluster of glowing orange embers with small flickering flames, respectable warm fire, modest but satisfying, glowing coals with visible heat' },
  { file: 'seonghwa/ember_80.png', category: 'icon', size: '1024x1024',
    prompt: 'bright vigorous flames rising from substantial ember bed, strong warm orange-yellow fire, sparks flying upward, powerful and lively blaze' },
  { file: 'seonghwa/ember_150.png', category: 'icon', size: '1024x1024',
    prompt: 'sacred mystical flame with violet-purple tinge, swirling ethereal fire dancing in spiral pattern, otherworldly divine hint, unusual color shift from orange to purple, rare spiritual essence' },
  { file: 'seonghwa/ember_300.png', category: 'icon', size: '1024x1024',
    prompt: 'massive raging sacred bonfire, towering pillar of golden-amber flames with purple highlights, majestic holy fire reaching upward, divine energy radiating, epic and awe-inspiring' },
  { file: 'seonghwa/sarajinun_bulggot_boots.png', category: 'icon', size: '1024x1024',
    prompt: 'legendary martial arts boots wreathed in vanishing crimson flame, dark lacquered leather with flame engravings, ethereal fire licking upward from the soles leaving embers in the air, Zoroastrian fire motifs on the ankle guards, sacred artifact of devouring flame, ornate and powerful' },
  { file: 'seonghwa/tamsik_bulggot_weapon.png', category: 'icon', size: '1024x1024',
    prompt: 'devouring flame sword, curved blade engulfed in hungry violet-orange flames that seem to consume the air around it, blackened hilt wrapped in red cord with ember inlays, hungry fire patterns etched on the blade surface, legendary Zoroastrian greedy-flame artifact, menacing and mystical' },
  { file: 'seonghwa/bulssui_sword.png', category: 'icon', size: '1024x1024',
    prompt: 'a single straight sword resting flat, slender steel blade with a tiny bound ember-knot smouldering near the guard, faint warm orange glow tracing the blade fuller, dark lacquered leather grip with simple cord wrap, modest sacred-fire artifact rather than a grand weapon, refined Zoroastrian flame motif, somber and elegant' },
  { file: 'seonghwa/ash_armor.png', category: 'icon', size: '1024x1024',
    prompt: 'sacred ash-grey scaled cuirass, layered overlapping plates that look like compressed pale ash, faint embers glowing between the seams, muted charcoal and bone palette with subdued warm highlights, reinforced shoulder pauldrons engraved with tiny flame sigils, solemn ascetic Zoroastrian armor of the extinguished pyre, weighty and ceremonial' },

  // 플레이어 캐릭터 (4단계 진화)
  { file: 'player/tier0_hucheon.png', category: 'character', size: '1024x1024',
    prompt: 'young martial artist beginner, simple white hanbok, wooden training sword, humble stance' },
  { file: 'player/tier1_seongcheon.png', category: 'character', size: '1024x1024',
    prompt: 'skilled martial artist, blue and white robes, steel sword, confident stance, faint qi aura' },
  { file: 'player/tier2_jeoljeong.png', category: 'character', size: '1024x1024',
    prompt: 'martial arts master, ornate dark robes with gold trim, glowing sword, powerful qi whirlwind' },
  { file: 'player/tier3_hwagyeong.png', category: 'character', size: '1024x1024',
    prompt: 'transcendent martial arts grandmaster, celestial white and gold robes, radiant aura, floating, divine energy' },
];

function buildFullPrompt(entry: AssetEntry): string {
  const suffix =
    entry.category === 'icon' ? ICON_SUFFIX :
    entry.category === 'character' ? CHARACTER_SUFFIX :
    BACKGROUND_SUFFIX;
  return `${STYLE_PREFIX}, ${suffix}, ${entry.prompt}`;
}

async function generateAsset(entry: AssetEntry): Promise<void> {
  const outPath = path.join(ASSETS_DIR, entry.file);

  // 이미 존재하면 스킵
  if (fs.existsSync(outPath)) {
    console.log(`⏭️  스킵 (이미 존재): ${entry.file}`);
    return;
  }

  // 출력 디렉터리 확인
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const fullPrompt = buildFullPrompt(entry);
  console.log(`🎨 생성 중: ${entry.file}`);
  console.log(`   프롬프트: ${fullPrompt.slice(0, 100)}...`);

  try {
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: fullPrompt,
      n: 1,
      size: entry.size,
    });

    // gpt-image-1은 b64_json으로 반환
    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      console.error(`❌ 이미지 데이터 없음: ${entry.file}`);
      return;
    }

    const buffer = Buffer.from(b64, 'base64');
    fs.writeFileSync(outPath, buffer);
    console.log(`✅ 저장 완료: ${entry.file} (${(buffer.length / 1024).toFixed(1)} KB)`);
  } catch (err: any) {
    console.error(`❌ 생성 실패: ${entry.file} - ${err.message ?? err}`);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('무림 방치록 - 이미지 에셋 생성 스크립트');
  console.log(`총 ${ASSETS.length}개 에셋을 생성합니다.`);
  console.log('='.repeat(60));
  console.log('');

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of ASSETS) {
    const outPath = path.join(ASSETS_DIR, entry.file);
    if (fs.existsSync(outPath)) {
      skipped++;
      console.log(`⏭️  스킵: ${entry.file}`);
      continue;
    }

    try {
      await generateAsset(entry);
      generated++;
    } catch {
      failed++;
    }

    // API 레이트 리밋 방지: 요청 간 1초 대기
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`완료! 생성: ${generated}, 스킵: ${skipped}, 실패: ${failed}`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('스크립트 실행 오류:', err);
  process.exit(1);
});
