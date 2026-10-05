import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createPHB2024Character, GameApiError, loadPHB2024CharacterOptions, validatePHB2024Character } from '../api/game'
import type {
  PersistedCharacterCreation,
  CharacterValidation,
  PHB2024BackgroundOption,
  PHB2024CharacterDraft,
  PHB2024CharacterOptions,
  PHB2024EquipmentPackage,
  PHB2024SpeciesOption,
} from '../types/game'

interface CharacterWizardProps {
  onCreated: (created: PersistedCharacterCreation, classLabel: string) => Promise<boolean>
}

const steps = ['Nome', 'Classe', 'Espécie', 'Origem', 'Atributos', 'Perícias', 'Itens', 'Resumo']
const ABILITY_NAMES: Record<string, string> = {
  strength: 'Força', dexterity: 'Destreza', constitution: 'Constituição',
  intelligence: 'Inteligência', wisdom: 'Sabedoria', charisma: 'Carisma',
}
const SKILL_NAMES: Record<string, string> = {
  acrobatics: 'Acrobacia', animal_handling: 'Lidar com Animais', arcana: 'Arcanismo', athletics: 'Atletismo',
  deception: 'Enganação', history: 'História', insight: 'Intuição', intimidation: 'Intimidação',
  investigation: 'Investigação', medicine: 'Medicina', nature: 'Natureza', perception: 'Percepção',
  performance: 'Atuação', persuasion: 'Persuasão', religion: 'Religião', sleight_of_hand: 'Prestidigitação',
  stealth: 'Furtividade', survival: 'Sobrevivência',
}
const OPTION_NAMES: Record<string, string> = {
  small: 'Pequeno', medium: 'Médio', black: 'Preto', blue: 'Azul', brass: 'Latão', bronze: 'Bronze',
  copper: 'Cobre', gold: 'Ouro', green: 'Verde', red: 'Vermelho', silver: 'Prata', white: 'Branco', abyssal: 'Abissal',
  drow: 'Drow', high_elf: 'Alto Elfo', wood_elf: 'Elfo da Floresta', forest_gnome: 'Gnomo da Floresta',
  rock_gnome: 'Gnomo das Rochas', cloud: 'Nuvem', fire: 'Fogo', frost: 'Gelo', hill: 'Colina',
  stone: 'Pedra', storm: 'Tempestade', chthonic: 'Ctônico', infernal: 'Infernal',
  alert: 'Alerta', crafter: 'Artesão', healer: 'Curandeiro', lucky: 'Sortudo', tavern_brawler: 'Brigão de Taverna', magic_initiate_cleric: 'Iniciado em Magia (Clérigo)',
  magic_initiate_druid: 'Iniciado em Magia (Druida)', magic_initiate_wizard: 'Iniciado em Magia (Mago)',
  musician: 'Músico', savage_attacker: 'Atacante Selvagem', skilled: 'Habilidoso', tough: 'Robusto',
  intelligence: 'Inteligência', wisdom: 'Sabedoria', charisma: 'Carisma', strength: 'Força',
  dexterity: 'Destreza', constitution: 'Constituição',
}
const METHOD_LABELS: Record<string, string> = {
  standard_array: 'Valores Padrão', point_buy: 'Compra por Pontos', rolled: 'Rolagem de Dados',
}
const CHOICE_FIELD_NAMES: Record<string, string> = {
  size: 'Tamanho', draconic_ancestry: 'Ancestralidade dracônica', elven_lineage: 'Linhagem élfica',
  spellcasting_ability: 'Atributo de conjuração', keen_senses_skill: 'Perícia de Sentidos Aguçados',
  gnomish_lineage: 'Linhagem gnômica', giant_ancestry: 'Ancestralidade gigante',
  skillful_skill: 'Perícia de Habilidoso', versatile_feat: 'Talento versátil', fiendish_legacy: 'Legado ínfero',
}

type AbilityMap = Record<string, number>
type BonusMode = 'two_one' | 'three_one'

function displayId(value: string) {
  return value.split('_').map((part) => part ? part[0].toUpperCase() + part.slice(1) : '').join(' ')
}

function abilityName(value: string) {
  return ABILITY_NAMES[value] ?? displayId(value)
}

function skillName(value: string) {
  return SKILL_NAMES[value] ?? displayId(value)
}

function optionName(field: string, value: string) {
  if (field === 'spellcasting_ability') return abilityName(value)
  if (field.includes('skill')) return skillName(value)
  return OPTION_NAMES[value] ?? displayId(value)
}

function choiceFieldName(field: string) {
  return CHOICE_FIELD_NAMES[field] ?? displayId(field)
}

function formatModifier(value: number | undefined) {
  return typeof value === 'number' ? `${value >= 0 ? '+' : ''}${value}` : '—'
}

function requestError(error: unknown) {
  return error instanceof GameApiError ? error.message : 'Não foi possível concluir a solicitação. Tente novamente.'
}

function assignedStandardArray(options: PHB2024CharacterOptions, assigned: AbilityMap) {
  const abilityIds = options.abilities
  if (Object.keys(assigned).length !== abilityIds.length) return false
  const available = [...options.ability_score_methods.standard_array.values].sort((a, b) => a - b)
  const selected = abilityIds.map((id) => assigned[id]).sort((a, b) => a - b)
  return selected.every((score, index) => score === available[index])
}

function pointBuyCost(options: PHB2024CharacterOptions, assigned: AbilityMap) {
  return Object.values(assigned).reduce((total, score) => total + (options.ability_score_methods.point_buy.costs[String(score)] ?? Number.POSITIVE_INFINITY), 0)
}

function formatPackage(items: PHB2024EquipmentPackage['items']) {
  return items.map((entry) => `${entry.quantity > 1 ? `${entry.quantity}× ` : ''}${entry.name}`).join(' · ') || 'Sem itens'
}

function grantedSpeciesSkills(species: PHB2024SpeciesOption | undefined, choices: Record<string, string>) {
  if (species?.id === 'human' && choices.skillful_skill) return [choices.skillful_skill]
  if (species?.id === 'elf' && choices.keen_senses_skill) return [choices.keen_senses_skill]
  return []
}

export function CharacterWizard({ onCreated }: CharacterWizardProps) {
  const [options, setOptions] = useState<PHB2024CharacterOptions | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [classId, setClassId] = useState('')
  const [speciesId, setSpeciesId] = useState('')
  const [speciesChoices, setSpeciesChoices] = useState<Record<string, string>>({})
  const [backgroundId, setBackgroundId] = useState('')
  const [alignmentId, setAlignmentId] = useState('')
  const [languageChoices, setLanguageChoices] = useState<string[]>([])
  const [abilityMethodId, setAbilityMethodId] = useState<'standard_array' | 'point_buy' | 'rolled'>('standard_array')
  const [baseAbilities, setBaseAbilities] = useState<AbilityMap>({})
  const [bonusMode, setBonusMode] = useState<BonusMode>('two_one')
  const [boostTwo, setBoostTwo] = useState('')
  const [boostOne, setBoostOne] = useState('')
  const [boostOnes, setBoostOnes] = useState<string[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [classEquipmentOption, setClassEquipmentOption] = useState('')
  const [backgroundEquipmentOption, setBackgroundEquipmentOption] = useState('')
  const [preview, setPreview] = useState<CharacterValidation | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)
  const submitting = useRef(false)
  const title = useRef<HTMLHeadingElement | null>(null)

  const fetchOptions = useCallback(async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoadingOptions(true)
    setError(null)
    try {
      const catalog = await loadPHB2024CharacterOptions(controller.signal)
      if (!controller.signal.aborted) setOptions(catalog)
    } catch (failure) {
      if (!controller.signal.aborted) setError(requestError(failure))
    } finally {
      if (!controller.signal.aborted) setLoadingOptions(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    request.current = controller
    void loadPHB2024CharacterOptions(controller.signal).then((catalog) => {
      if (!controller.signal.aborted) setOptions(catalog)
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(requestError(failure))
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingOptions(false)
    })
    return () => request.current?.abort()
  }, [])

  useEffect(() => {
    if (step > 0) title.current?.focus()
  }, [step])

  const chosenClass = options?.classes.find((choice) => choice.id === classId)
  const chosenSpecies = options?.species.find((choice) => choice.id === speciesId)
  const chosenBackground = options?.backgrounds.find((choice) => choice.id === backgroundId)
  const eligibleSkills = chosenClass?.skill_choices.options ?? []
  const eligibleBackgroundAbilities = chosenBackground?.eligible_abilities ?? []
  const speciesSkillChoices = grantedSpeciesSkills(chosenSpecies, speciesChoices)
  const selectedBackgroundIncreases: AbilityMap = {}
  if (bonusMode === 'two_one' && boostTwo && boostOne && boostTwo !== boostOne) {
    selectedBackgroundIncreases[boostTwo] = 2
    selectedBackgroundIncreases[boostOne] = 1
  } else if (bonusMode === 'three_one') {
    for (const id of boostOnes) if (id) selectedBackgroundIncreases[id] = 1
  }
  const finalAbilities: AbilityMap = { ...baseAbilities }
  for (const [id, increase] of Object.entries(selectedBackgroundIncreases)) {
    if (typeof finalAbilities[id] === 'number') finalAbilities[id] += increase
  }
  const pointBuySpend = options ? pointBuyCost(options, baseAbilities) : 0
  const abilityAssignmentComplete = Boolean(options && (
    abilityMethodId === 'standard_array' ? assignedStandardArray(options, baseAbilities)
      : abilityMethodId === 'point_buy' ? Object.keys(baseAbilities).length === options.abilities.length &&
        Object.values(baseAbilities).every((score) => score >= options.ability_score_methods.point_buy.minimum && score <= options.ability_score_methods.point_buy.maximum) &&
        pointBuySpend <= options.ability_score_methods.point_buy.budget
        : Object.keys(baseAbilities).length === options.abilities.length && Object.values(baseAbilities).every((score) => score >= 3 && score <= 18)
  ))
  const increasesComplete = Boolean(chosenBackground && (
    bonusMode === 'two_one'
      ? eligibleBackgroundAbilities.includes(boostTwo) && eligibleBackgroundAbilities.includes(boostOne) && boostTwo !== boostOne
      : boostOnes.length === 3 && new Set(boostOnes).size === 3 && boostOnes.every((id) => eligibleBackgroundAbilities.includes(id))
  ))
  const speciesComplete = Boolean(chosenSpecies && Object.entries(chosenSpecies.choices).every(([field, values]) =>
    values.length === 0 || (Boolean(speciesChoices[field]) && values.includes(speciesChoices[field]))))
  const originComplete = Boolean(chosenBackground && alignmentId &&
    languageChoices.length === options?.language_rules.additional_choice_count &&
    new Set(languageChoices).size === languageChoices.length)
  const complete = step === 0 ? Boolean(name.trim())
    : step === 1 ? Boolean(chosenClass)
      : step === 2 ? speciesComplete
        : step === 3 ? originComplete
          : step === 4 ? abilityAssignmentComplete && increasesComplete &&
            Object.values(finalAbilities).length === 6 && Object.values(finalAbilities).every((score) => score <= 20)
            : step === 5 ? Boolean(chosenClass && skills.length === chosenClass.skill_choices.count && skills.every((id) => eligibleSkills.includes(id)))
              : step === 6 ? Boolean(chosenClass?.equipment_packages.some((pack) => pack.id === classEquipmentOption) &&
                chosenBackground?.equipment_packages.some((pack) => pack.id === backgroundEquipmentOption))
                : Boolean(preview)

  function setSpecies(species: PHB2024SpeciesOption) {
    setSpeciesId(species.id)
    setSpeciesChoices({})
    setPreview(null)
  }

  function setBackground(background: PHB2024BackgroundOption) {
    setBackgroundId(background.id)
    setBoostTwo('')
    setBoostOne('')
    setBoostOnes([])
    setBackgroundEquipmentOption('')
    setPreview(null)
  }

  function chooseScore(abilityId: string, value: string) {
    setBaseAbilities((current) => {
      const updated = { ...current }
      if (value === '') delete updated[abilityId]
      else updated[abilityId] = Number(value)
      return updated
    })
    setPreview(null)
  }

  function chooseMethod(method: 'standard_array' | 'point_buy' | 'rolled') {
    setAbilityMethodId(method)
    setBaseAbilities({})
    setPreview(null)
  }

  function applyRecommendation() {
    if (!options || !classId) return
    const suggested = options.recommended_standard_array[classId]
    if (suggested) {
      setAbilityMethodId('standard_array')
      setBaseAbilities({ ...suggested })
      setPreview(null)
    }
  }

  function toggleSkill(id: string) {
    if (!chosenClass) return
    setSkills((current) => current.includes(id)
      ? current.filter((skill) => skill !== id)
      : current.length < chosenClass.skill_choices.count ? [...current, id] : current)
    setPreview(null)
  }

  function toggleLanguage(id: string) {
    const limit = options?.language_rules.additional_choice_count ?? 2
    setLanguageChoices((current) => current.includes(id)
      ? current.filter((language) => language !== id)
      : current.length < limit ? [...current, id] : current)
    setPreview(null)
  }

  function draft(): PHB2024CharacterDraft {
    return {
      name: name.trim(),
      class_id: classId,
      level: 1,
      species_id: speciesId,
      species_choices: speciesChoices,
      background_id: backgroundId,
      alignment_id: alignmentId,
      ability_method_id: abilityMethodId,
      base_abilities: baseAbilities,
      background_ability_increases: selectedBackgroundIncreases,
      abilities: finalAbilities,
      skills,
      language_choices: languageChoices,
      class_equipment_option: classEquipmentOption,
      background_equipment_option: backgroundEquipmentOption,
      class_choices: {},
    }
  }

  async function next() {
    if (!complete || busy || submitting.current) return
    setError(null)
    if (step !== 6) {
      setStep((previous) => previous + 1)
      return
    }
    submitting.current = true
    setBusy(true)
    try {
      const validation = await validatePHB2024Character(draft())
      setPreview(validation)
      setStep(7)
    } catch (failure) {
      setError(requestError(failure))
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  async function confirm() {
    if (!preview || busy || submitting.current) return
    submitting.current = true
    setBusy(true)
    setError(null)
    try {
      const created = await createPHB2024Character(draft())
      const confirmedClass = created.character.class
      const confirmedId = confirmedClass && typeof confirmedClass === 'object' && 'id' in confirmedClass ? confirmedClass.id : null
      const confirmedClassName = chosenClass && confirmedId === chosenClass.id ? chosenClass.name : classId
      await onCreated(created, confirmedClassName)
    } catch (failure) {
      setError(requestError(failure))
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  function back() {
    if (busy) return
    if (step === 7) setPreview(null)
    setError(null)
    setStep((previous) => Math.max(0, previous - 1))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step === steps.length - 1) void confirm()
    else void next()
  }

  const classPackage = chosenClass?.equipment_packages.find((pack) => pack.id === classEquipmentOption)
  const backgroundPackage = chosenBackground?.equipment_packages.find((pack) => pack.id === backgroundEquipmentOption)
  const chosenAlignment = options?.alignment_options.find((alignment) => alignment.id === alignmentId)
  const chosenLanguages = options?.language_rules.additional_options.filter((language) => languageChoices.includes(language.id)) ?? []
  const grantedSkills = [...new Set([...(chosenBackground?.skill_proficiencies ?? []), ...speciesSkillChoices])]
  const originBonusSummary = Object.entries(selectedBackgroundIncreases)
    .map(([id, bonus]) => `${abilityName(id)} +${bonus}`).join(' · ')

  return (
    <section className="wizard" aria-labelledby="wizard-title">
      <div className="wizard-intro">
        <span className="section-kicker"><span className="kicker-line" /> O início da sua jornada</span>
        <h1 id="wizard-title">Toda lenda começa <em>com alguém.</em></h1>
        <p>Criação baseada exclusivamente no Livro do Jogador 2024. As escolhas são verificadas pelo motor de regras.</p>
      </div>

      {loadingOptions ? (
        <p className="wizard-notice" role="status">Carregando as opções de personagem do PHB 2024…</p>
      ) : !options ? (
        <div className="wizard-notice" role="alert">
          <p>{error ?? 'Não foi possível carregar o catálogo de personagem.'}</p>
          <button type="button" className="wizard-button" onClick={() => void fetchOptions()}>Tentar novamente</button>
        </div>
      ) : (
        <div className="wizard-panel">
          <div className="wizard-progress"><span>Criação de personagem · PHB 2024</span><strong>Etapa {step + 1} de {steps.length}</strong></div>
          <ol className="wizard-steps" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label="Etapas da criação">
            {steps.map((label, index) => (
              <li key={label} className={index === step ? 'is-active' : index < step ? 'is-done' : ''} aria-current={index === step ? 'step' : undefined}>
                <span aria-hidden="true">{index + 1}</span><small>{label}</small>
              </li>
            ))}
          </ol>

          <form onSubmit={submit} noValidate>
            <div className="wizard-step" key={step}>
              {step === 0 && <>
                <h2 ref={title} tabIndex={-1}>Como devemos chamar você?</h2>
                <p>Escolha um nome para o personagem que vai viver esta história.</p>
                <label className="wizard-label" htmlFor="character-name">Nome do personagem</label>
                <input id="character-name" name="name" className="wizard-text" value={name} onChange={(event) => { setName(event.target.value); setPreview(null) }} maxLength={128} autoComplete="off" placeholder="Digite um nome" aria-describedby="name-help" />
                <small id="name-help" className="wizard-help">O personagem começa no nível 1.</small>
              </>}

              {step === 1 && <>
                <h2 ref={title} tabIndex={-1}>Escolha sua classe</h2>
                <p>A classe determina suas capacidades iniciais. Estas são as 12 classes do Livro do Jogador 2024.</p>
                <fieldset className="wizard-fieldset"><legend className="wizard-label">Classes do PHB 2024</legend>
                  <div className="wizard-options wizard-options--grid">
                    {options.classes.map((choice) => <label key={choice.id} className={`wizard-choice ${choice.id === classId ? 'is-selected' : ''}`}>
                      <input type="radio" name="class" value={choice.id} checked={choice.id === classId} onChange={() => {
                        setClassId(choice.id); setSkills([]); setClassEquipmentOption(''); setPreview(null)
                      }} />
                      <span><strong>{choice.name}</strong><small>Dado de Vida d{choice.hit_die} · {choice.primary_abilities.map(abilityName).join(', ')}</small></span>
                    </label>)}
                  </div>
                </fieldset>
                <p className="wizard-help">Nível inicial fixo: 1.</p>
              </>}

              {step === 2 && <>
                <h2 ref={title} tabIndex={-1}>Escolha sua espécie</h2>
                <p>Espécie e escolhas associadas são registradas conforme o catálogo 2024.</p>
                <fieldset className="wizard-fieldset"><legend className="wizard-label">Espécies</legend>
                  <div className="wizard-options wizard-options--grid">
                    {options.species.map((choice) => <label key={choice.id} className={`wizard-choice ${choice.id === speciesId ? 'is-selected' : ''}`}>
                      <input type="radio" name="species" value={choice.id} checked={choice.id === speciesId} onChange={() => setSpecies(choice)} />
                      <span><strong>{choice.name}</strong><small>Identidade registrada na ficha</small></span>
                    </label>)}
                  </div>
                </fieldset>
                {chosenSpecies && Object.entries(chosenSpecies.choices).filter(([, values]) => values.length > 0).map(([field, values]) => (
                    <label className="wizard-label" key={field} htmlFor={`species-${field}`}>
                    {choiceFieldName(field)}
                    <select id={`species-${field}`} value={speciesChoices[field] ?? ''} onChange={(event) => {
                      setSpeciesChoices((current) => ({ ...current, [field]: event.target.value })); setPreview(null)
                    }}>
                      <option value="">Escolha uma opção</option>
                      {values.map((value) => <option key={value} value={value}>{optionName(field, value)}</option>)}
                    </select>
                  </label>
                ))}
              </>}

              {step === 3 && <>
                <h2 ref={title} tabIndex={-1}>Defina sua origem</h2>
                <p>Escolha um background do PHB 2024; ele determina o talento de origem e as opções de aumento de atributo.</p>
                <fieldset className="wizard-fieldset"><legend className="wizard-label">Origens do Livro do Jogador 2024</legend>
                  <div className="wizard-options wizard-options--grid">
                    {options.backgrounds.map((choice) => <label key={choice.id} className={`wizard-choice ${choice.id === backgroundId ? 'is-selected' : ''}`}>
                      <input type="radio" name="background" value={choice.id} checked={choice.id === backgroundId} onChange={() => setBackground(choice)} />
                      <span><strong>{choice.name}</strong><small>{choice.origin_feat_label_pt_br} · {choice.skill_proficiencies.map(skillName).join(', ')}</small></span>
                    </label>)}
                  </div>
                </fieldset>
                <label className="wizard-label" htmlFor="alignment">Alinhamento
                  <select id="alignment" value={alignmentId} onChange={(event) => { setAlignmentId(event.target.value); setPreview(null) }}>
                    <option value="">Escolha um alinhamento</option>
                    {options.alignment_options.map((choice) => <option key={choice.id} value={choice.id}>{choice.name}</option>)}
                  </select>
                </label>
                <fieldset className="wizard-fieldset"><legend className="wizard-label">Idiomas adicionais — escolha {options.language_rules.additional_choice_count}</legend>
                  <div className="wizard-options wizard-options--grid">
                    {options.language_rules.additional_options.map((language) => <label key={language.id} className={`wizard-choice ${languageChoices.includes(language.id) ? 'is-selected' : ''}`}>
                      <input type="checkbox" checked={languageChoices.includes(language.id)} disabled={!languageChoices.includes(language.id) && languageChoices.length >= options.language_rules.additional_choice_count} onChange={() => toggleLanguage(language.id)} />
                      <span><strong>{language.name}</strong></span>
                    </label>)}
                  </div>
                </fieldset>
                <p className="wizard-help" role="status">Comum é incluído automaticamente · {languageChoices.length} de {options.language_rules.additional_choice_count} idiomas escolhidos.</p>
              </>}

              {step === 4 && <>
                <h2 ref={title} tabIndex={-1}>Atribua seus atributos</h2>
                <p>Escolha um método do PHB 2024 e aplique os aumentos oferecidos pela origem selecionada.</p>
                <fieldset className="wizard-fieldset"><legend className="wizard-label">Método de geração</legend>
                  <div className="wizard-options wizard-options--grid">
                    {(['standard_array', 'point_buy', 'rolled'] as const).map((method) => <label key={method} className={`wizard-choice ${abilityMethodId === method ? 'is-selected' : ''}`}>
                      <input type="radio" name="ability-method" checked={abilityMethodId === method} onChange={() => chooseMethod(method)} />
                      <span><strong>{METHOD_LABELS[method]}</strong><small>{method === 'standard_array' ? options.ability_score_methods.standard_array.values.join(', ') : method === 'point_buy' ? `${options.ability_score_methods.point_buy.budget} pontos` : `${options.ability_score_methods.rolled.dice}, descartando ${options.ability_score_methods.rolled.drop_lowest}`}</small></span>
                    </label>)}
                  </div>
                </fieldset>
                {abilityMethodId === 'standard_array' && classId && <button type="button" className="wizard-button wizard-suggest-button" onClick={applyRecommendation}>Usar distribuição recomendada para {chosenClass?.name}</button>}
                {abilityMethodId === 'point_buy' && <p className="wizard-help" role="status">Pontos gastos: {pointBuySpend} de {options.ability_score_methods.point_buy.budget}.</p>}
                {abilityMethodId === 'rolled' && <p className="wizard-help">Insira os resultados obtidos rolando {options.ability_score_methods.rolled.dice} e descartando o menor dado, conforme o PHB 2024.</p>}
                <div className="wizard-attributes">
                  {options.abilities.map((abilityId) => {
                    const score = baseAbilities[abilityId]
                    const used = Object.entries(baseAbilities).filter(([id, value]) => id !== abilityId && value === score).length
                    const standardLimit = options.ability_score_methods.standard_array.values.filter((value) => value === score).length
                    return <div className="wizard-attribute" key={abilityId}>
                      <label htmlFor={`score-${abilityId}`}>{abilityName(abilityId)}</label>
                      {abilityMethodId === 'rolled' ? <input id={`score-${abilityId}`} type="number" min={3} max={18} value={score ?? ''} onChange={(event) => chooseScore(abilityId, event.target.value)} />
                        : <select id={`score-${abilityId}`} value={score ?? ''} onChange={(event) => chooseScore(abilityId, event.target.value)}>
                          <option value="">Escolha</option>
                          {(abilityMethodId === 'standard_array' ? options.ability_score_methods.standard_array.values : Array.from({ length: options.ability_score_methods.point_buy.maximum - options.ability_score_methods.point_buy.minimum + 1 }, (_, index) => index + options.ability_score_methods.point_buy.minimum)).map((value, index) => {
                            const duplicateUnavailable = abilityMethodId === 'standard_array' && used >= standardLimit
                            return <option key={`${value}-${index}`} value={value} disabled={duplicateUnavailable && score !== value}>{value}</option>
                          })}
                        </select>}
                      <small>Final: {typeof finalAbilities[abilityId] === 'number' ? finalAbilities[abilityId] : '—'}</small>
                    </div>
                  })}
                </div>
                <fieldset className="wizard-fieldset"><legend className="wizard-label">Aumento de atributo da origem{chosenBackground ? ` · ${chosenBackground.name}` : ''}</legend>
                  <div className="wizard-choice wizard-choice--plain">
                    <label><input type="radio" name="bonus-mode" checked={bonusMode === 'two_one'} onChange={() => { setBonusMode('two_one'); setBoostTwo(''); setBoostOne(''); setPreview(null) }} /> +2 em um atributo e +1 em outro</label>
                    <label><input type="radio" name="bonus-mode" checked={bonusMode === 'three_one'} onChange={() => { setBonusMode('three_one'); setBoostTwo(''); setBoostOne(''); setBoostOnes([]); setPreview(null) }} /> +1 em três atributos diferentes</label>
                  </div>
                  {bonusMode === 'two_one' ? <div className="wizard-bonus-selects">
                    <label className="wizard-label" htmlFor="boost-two">Atributo que recebe +2
                      <select id="boost-two" value={boostTwo} onChange={(event) => { setBoostTwo(event.target.value); setPreview(null) }}>
                        <option value="">Escolha</option>{eligibleBackgroundAbilities.map((id) => <option key={id} value={id}>{abilityName(id)}</option>)}
                      </select>
                    </label>
                    <label className="wizard-label" htmlFor="boost-one">Atributo diferente que recebe +1
                      <select id="boost-one" value={boostOne} onChange={(event) => { setBoostOne(event.target.value); setPreview(null) }}>
                        <option value="">Escolha</option>{eligibleBackgroundAbilities.filter((id) => id !== boostTwo).map((id) => <option key={id} value={id}>{abilityName(id)}</option>)}
                      </select>
                    </label>
                  </div> : <div className="wizard-bonus-selects wizard-bonus-selects--three">
                    {[0, 1, 2].map((index) => <label className="wizard-label" htmlFor={`boost-one-${index}`} key={index}>Atributo {index + 1} recebe +1
                      <select id={`boost-one-${index}`} value={boostOnes[index] ?? ''} onChange={(event) => {
                        setBoostOnes((current) => { const next = [...current]; next[index] = event.target.value; return next })
                        setPreview(null)
                      }}>
                        <option value="">Escolha</option>{eligibleBackgroundAbilities.filter((id) => !boostOnes.includes(id) || boostOnes[index] === id).map((id) => <option key={id} value={id}>{abilityName(id)}</option>)}
                      </select>
                    </label>)}
                  </div>}
                  {chosenBackground && <p className="wizard-help">A origem permite aumentos em: {eligibleBackgroundAbilities.map(abilityName).join(', ') || '—'}. {originBonusSummary && `Selecionado: ${originBonusSummary}.`}</p>}
                </fieldset>
              </>}

              {step === 5 && <>
                <h2 ref={title} tabIndex={-1}>Escolha suas perícias</h2>
                <p>Selecione {chosenClass?.skill_choices.count} perícias entre as opções da classe {chosenClass?.name}.</p>
                <fieldset className="wizard-fieldset"><legend className="wizard-label">Opções da classe</legend>
                  <div className="wizard-options wizard-options--grid">
                    {eligibleSkills.map((skill) => <label key={skill} className={`wizard-choice ${skills.includes(skill) ? 'is-selected' : ''}`}>
                      <input type="checkbox" checked={skills.includes(skill)} disabled={!skills.includes(skill) && skills.length >= (chosenClass?.skill_choices.count ?? 0)} onChange={() => toggleSkill(skill)} />
                      <span><strong>{skillName(skill)}</strong></span>
                    </label>)}
                  </div>
                </fieldset>
                <p className="wizard-help" role="status">{skills.length} de {chosenClass?.skill_choices.count} escolhidas.</p>
                {grantedSkills.length > 0 && <div className="wizard-granted"><strong>Também concedidas pela origem/espécie</strong><span>{grantedSkills.map(skillName).join(' · ')}</span></div>}
              </>}

              {step === 6 && <>
                <h2 ref={title} tabIndex={-1}>Escolha o equipamento inicial</h2>
                <p>Os pacotes são os oferecidos pela classe e pela origem no PHB 2024; o conteúdo selecionado será registrado na ficha.</p>
                <fieldset className="wizard-fieldset"><legend className="wizard-label">Pacote de {chosenClass?.name}</legend>
                  <div className="wizard-options wizard-options--grid">
                    {chosenClass?.equipment_packages.map((pack) => <label key={pack.id} className={`wizard-choice ${classEquipmentOption === pack.id ? 'is-selected' : ''}`}>
                      <input type="radio" name="class-equipment" value={pack.id} checked={classEquipmentOption === pack.id} onChange={() => { setClassEquipmentOption(pack.id); setPreview(null) }} />
                      <span><strong>Opção {pack.id}</strong><small>{formatPackage(pack.items)} · {pack.gold_gp} po</small></span>
                    </label>)}
                  </div>
                </fieldset>
                <fieldset className="wizard-fieldset"><legend className="wizard-label">Pacote de {chosenBackground?.name}</legend>
                  <div className="wizard-options wizard-options--grid">
                    {chosenBackground?.equipment_packages.map((pack) => <label key={pack.id} className={`wizard-choice ${backgroundEquipmentOption === pack.id ? 'is-selected' : ''}`}>
                      <input type="radio" name="background-equipment" value={pack.id} checked={backgroundEquipmentOption === pack.id} onChange={() => { setBackgroundEquipmentOption(pack.id); setPreview(null) }} />
                      <span><strong>Opção {pack.id}</strong><small>{formatPackage(pack.items)} · {pack.gold_gp} po</small></span>
                    </label>)}
                  </div>
                </fieldset>
                {classPackage && backgroundPackage && <p className="wizard-help">Total: {classPackage.gold_gp + backgroundPackage.gold_gp} po · os itens dos dois pacotes serão registrados.</p>}
              </>}

              {step === 7 && preview && <>
                <h2 ref={title} tabIndex={-1}>Sua ficha, pronta para começar</h2>
                <p>O motor validou as escolhas segundo o PHB 2024. Revise o resumo antes de confirmar.</p>
                <div className="wizard-summary" aria-label="Resumo da ficha validada">
                  <div className="wizard-summary-identity"><span className="section-kicker">Seu personagem</span><strong>{String(preview.character.name)}</strong><span>{chosenClass?.name} · {chosenSpecies?.name} · Nível 1</span><small>{chosenBackground?.name} · {chosenAlignment?.name}</small></div>
                  <div className="wizard-summary-stats">
                    <span><small>PV</small><strong>{preview.derived.hp.current}/{preview.derived.hp.max}</strong></span>
                    <span><small>CA</small><strong>{preview.derived.ac.value}</strong></span>
                    <span><small>Iniciativa</small><strong>{formatModifier(preview.derived.initiative_modifier)}</strong></span>
                    <span><small>Proficiência</small><strong>{formatModifier(preview.derived.proficiency_bonus)}</strong></span>
                  </div>
                  <div className="wizard-summary-section"><h3>Atributos finais</h3><dl>{options.abilities.map((id) => <div key={id}><dt>{abilityName(id)}</dt><dd>{String(finalAbilities[id] ?? '—')} <small>({formatModifier(preview.derived.ability_modifiers[id])})</small></dd></div>)}</dl><p className="wizard-help">Método: {METHOD_LABELS[abilityMethodId]} · Aumentos: {originBonusSummary}</p></div>
                  <div className="wizard-summary-section"><h3>Perícias</h3><dl>{[...new Set([...skills, ...grantedSkills])].map((id) => <div key={id}><dt>{skillName(id)}</dt><dd>{formatModifier(preview.derived.skill_modifiers[id])}</dd></div>)}</dl></div>
                  <div className="wizard-summary-section"><h3>Proficiências e origem</h3><p>Salvaguardas: {chosenClass?.saving_throw_proficiencies.map(abilityName).join(', ')}.</p><p>Talento de origem: {chosenBackground?.origin_feat_label_pt_br}.</p></div>
                  <div className="wizard-summary-section"><h3>Idiomas</h3><p>{[...options.language_rules.required.map((id) => id === 'common' ? 'Comum' : displayId(id)), ...chosenLanguages.map((language) => language.name)].join(' · ')}</p></div>
                  <div className="wizard-summary-section"><h3>Equipamento inicial</h3><p>{formatPackage(classPackage?.items ?? [])} · {formatPackage(backgroundPackage?.items ?? [])}</p><p>Moedas: {(classPackage?.gold_gp ?? 0) + (backgroundPackage?.gold_gp ?? 0)} po.</p></div>
                </div>
              </>}
            </div>
            {error && <div className="error-banner" role="alert"><span className="error-icon" aria-hidden="true">!</span><div><strong>Não foi possível continuar.</strong><p>{error}</p><p>Suas escolhas foram mantidas. Você pode tentar novamente.</p></div></div>}
            <div className="wizard-controls">
              {step > 0 && <button type="button" className="wizard-button wizard-button--back" disabled={busy} onClick={back}>Voltar</button>}
              <button type="submit" className="wizard-button wizard-button--primary" disabled={!complete || busy}>
                {busy ? step === 7 ? 'Criando personagem…' : 'Validando ficha…' : step === 7 ? 'Confirmar personagem' : 'Continuar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
