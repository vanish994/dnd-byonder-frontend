import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createCharacter, GameApiError, loadCharacterOptions, validateCharacter } from '../api/game'
import type { CharacterClassOption, CharacterCreation, CharacterDraft, CharacterOptions, CharacterValidation } from '../types/game'

interface CharacterWizardProps {
  onCreated: (created: CharacterCreation, classLabel: string) => Promise<boolean>
}

const steps = ['Nome', 'Classe', 'Atributos', 'Perícias', 'Equipamento', 'Resumo']

function formatModifier(value: number | undefined) {
  return typeof value === 'number' ? `${value >= 0 ? '+' : ''}${value}` : '—'
}

function requestError(error: unknown) {
  return error instanceof GameApiError ? error.message : 'Não foi possível concluir a solicitação. Tente novamente.'
}

function selectionComplete(options: CharacterOptions, assigned: Record<string, number>) {
  if (Object.keys(assigned).length !== options.abilities.length) return false
  const remaining = [...options.standard_array]
  for (const ability of options.abilities) {
    const index = remaining.indexOf(assigned[ability.id])
    if (index === -1) return false
    remaining.splice(index, 1)
  }
  return remaining.length === 0
}

export function CharacterWizard({ onCreated }: CharacterWizardProps) {
  const [options, setOptions] = useState<CharacterOptions | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [classId, setClassId] = useState('')
  const [level, setLevel] = useState<number | null>(null)
  const [abilities, setAbilities] = useState<Record<string, number>>({})
  const [skills, setSkills] = useState<string[]>([])
  const [weaponId, setWeaponId] = useState('')
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
      const catalog = await loadCharacterOptions(controller.signal)
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
    void loadCharacterOptions(controller.signal).then((catalog) => {
      if (!controller.signal.aborted) setOptions(catalog)
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(requestError(failure))
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingOptions(false)
    })
    return () => request.current?.abort()
  }, [fetchOptions])

  useEffect(() => {
    if (step > 0) title.current?.focus()
  }, [step])

  const chosenClass = options?.classes.find((choice) => choice.id === classId)
  const allowedSkills = options?.skills.filter((skill) => chosenClass?.skill_options.includes(skill.id)) ?? []
  const allowedWeapons = options?.weapons.filter((weapon) => chosenClass?.weapon_options.includes(weapon.id)) ?? []
  const complete = step === 0 ? Boolean(name.trim())
    : step === 1 ? Boolean(chosenClass && level !== null && chosenClass.levels.includes(level))
      : step === 2 ? Boolean(options && selectionComplete(options, abilities))
        : step === 3 ? Boolean(chosenClass && skills.length === chosenClass.skill_choices && skills.every((id) => chosenClass.skill_options.includes(id)))
          : step === 4 ? Boolean(allowedWeapons.some((weapon) => weapon.id === weaponId)) : Boolean(preview)

  function draft(): CharacterDraft {
    return { name: name.trim(), class_id: classId, level: level as number, abilities, skills, weapon_id: weaponId }
  }

  async function next() {
    if (!complete || busy || submitting.current) return
    setError(null)
    if (step !== 4) {
      setStep((previous) => previous + 1)
      return
    }
    submitting.current = true
    setBusy(true)
    try {
      const validation = await validateCharacter(draft())
      setPreview(validation)
      setStep(5)
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
      const created = await createCharacter(draft())
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
    if (step === 5) setPreview(null)
    setError(null)
    setStep((previous) => Math.max(0, previous - 1))
  }

  function chooseClass(choice: CharacterClassOption) {
    setClassId(choice.id)
    setLevel(choice.levels.length === 1 ? choice.levels[0] : null)
    setSkills([])
    setWeaponId('')
    setPreview(null)
  }

  function chooseScore(abilityId: string, value: string) {
    setAbilities((current) => {
      const updated = { ...current }
      if (value === '') delete updated[abilityId]
      else updated[abilityId] = Number(value)
      return updated
    })
    setPreview(null)
  }

  function toggleSkill(id: string) {
    if (!chosenClass) return
    setSkills((current) => current.includes(id)
      ? current.filter((skill) => skill !== id)
      : current.length < chosenClass.skill_choices ? [...current, id] : current)
    setPreview(null)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step === steps.length - 1) void confirm()
    else void next()
  }

  return (
    <section className="wizard" aria-labelledby="wizard-title">
      <div className="wizard-intro">
        <span className="section-kicker"><span className="kicker-line" /> O início da sua jornada</span>
        <h1 id="wizard-title">Toda lenda começa <em>com alguém.</em></h1>
        <p>Crie seu personagem, uma escolha de cada vez. A ficha e as regras são conferidas pelo Mestre antes da aventura.</p>
      </div>

      {loadingOptions ? (
        <p className="wizard-notice" role="status">Carregando as opções de personagem…</p>
      ) : !options ? (
        <div className="wizard-notice" role="alert">
          <p>{error ?? 'Não foi possível carregar as opções de personagem.'}</p>
          <button type="button" className="wizard-button" onClick={() => void fetchOptions()}>Tentar novamente</button>
        </div>
      ) : (
        <div className="wizard-panel">
          <div className="wizard-progress"><span>Criação de personagem</span><strong>Etapa {step + 1} de {steps.length}</strong></div>
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
                <input id="character-name" name="name" className="wizard-text" value={name} onChange={(event) => setName(event.target.value)} maxLength={128} autoComplete="off" placeholder="Digite um nome" aria-describedby="name-help" />
                <small id="name-help" className="wizard-help">Você poderá revisar este nome antes de confirmar.</small>
              </>}
              {step === 1 && <>
                <h2 ref={title} tabIndex={-1}>Escolha sua classe</h2>
                <p>A classe define como seu personagem começa a aventura. Mostramos somente as opções disponíveis agora.</p>
                <fieldset className="wizard-fieldset"><legend className="wizard-label">Classes disponíveis</legend>
                  <div className="wizard-options">
                    {options.classes.map((choice) => <label key={choice.id} className={`wizard-choice ${choice.id === classId ? 'is-selected' : ''}`}>
                      <input type="radio" name="class" value={choice.id} checked={choice.id === classId} onChange={() => chooseClass(choice)} />
                      <span><strong>{choice.name}</strong>{choice.description && <small>{choice.description}</small>}</span>
                    </label>)}
                  </div>
                </fieldset>
                {chosenClass && chosenClass.levels.length > 1 && <>
                  <label className="wizard-label" htmlFor="character-level">Nível inicial</label>
                  <select id="character-level" value={level ?? ''} onChange={(event) => setLevel(Number(event.target.value))}>
                    <option value="" disabled>Escolha o nível</option>
                    {chosenClass.levels.map((available) => <option key={available} value={available}>{available}</option>)}
                  </select>
                </>}
                {chosenClass && level !== null && <p className="wizard-help">Nível inicial: {level}</p>}
              </>}
              {step === 2 && <>
                <h2 ref={title} tabIndex={-1}>Distribua seus atributos</h2>
                <p>Escolha um valor da lista do Mestre para cada atributo. Cada valor pode ser usado apenas a quantidade de vezes oferecida.</p>
                <div className="wizard-attributes">
                  {options.abilities.map((ability) => {
                    const score = abilities[ability.id]
                    return <div className="wizard-attribute" key={ability.id}>
                      <label htmlFor={`score-${ability.id}`}>{ability.name}{ability.abbreviation && <>{' '}<span>({ability.abbreviation})</span></>}</label>
                      {ability.description && <small id={`help-${ability.id}`}>{ability.description}</small>}
                      <select id={`score-${ability.id}`} value={score ?? ''} onChange={(event) => chooseScore(ability.id, event.target.value)} aria-describedby={ability.description ? `help-${ability.id}` : undefined}>
                        <option value="">Escolha um valor</option>
                        {options.standard_array.map((value, index) => {
                          const available = options.standard_array.filter((candidate) => candidate === value).length
                          const usedByOthers = Object.entries(abilities).filter(([id, selected]) => id !== ability.id && selected === value).length
                          return <option key={`${value}-${index}`} value={value} disabled={usedByOthers >= available && score !== value}>{value}</option>
                        })}
                      </select>
                    </div>
                  })}
                </div>
                <p className="wizard-help" role="status">{Object.keys(abilities).length} de {options.abilities.length} atributos preenchidos.</p>
              </>}
              {step === 3 && <>
                <h2 ref={title} tabIndex={-1}>Escolha suas perícias</h2>
                <p>Perícias representam conhecimentos e práticas do seu personagem. Escolha {chosenClass?.skill_choices} entre as oferecidas para esta classe.</p>
                <fieldset className="wizard-fieldset"><legend className="wizard-label">Perícias disponíveis</legend>
                  <div className="wizard-options wizard-options--grid">
                    {allowedSkills.map((skill) => <label key={skill.id} className={`wizard-choice ${skills.includes(skill.id) ? 'is-selected' : ''}`}>
                      <input type="checkbox" name="skills" value={skill.id} checked={skills.includes(skill.id)} disabled={!skills.includes(skill.id) && skills.length >= (chosenClass?.skill_choices ?? 0)} onChange={() => toggleSkill(skill.id)} />
                      <span><strong>{skill.name}</strong>{skill.description && <small>{skill.description}</small>}</span>
                    </label>)}
                  </div>
                </fieldset>
                <p className="wizard-help" role="status">{skills.length} de {chosenClass?.skill_choices} perícias escolhidas.</p>
              </>}
              {step === 4 && <>
                <h2 ref={title} tabIndex={-1}>Equipamento inicial</h2>
                <p>Escolha uma arma entre as opções disponíveis para sua classe. Os dados de combate virão da ficha conferida pelo Mestre.</p>
                <fieldset className="wizard-fieldset"><legend className="wizard-label">Armas disponíveis</legend>
                  <div className="wizard-options">
                    {allowedWeapons.map((weapon) => <label key={weapon.id} className={`wizard-choice ${weapon.id === weaponId ? 'is-selected' : ''}`}>
                      <input type="radio" name="weapon" value={weapon.id} checked={weapon.id === weaponId} onChange={() => { setWeaponId(weapon.id); setPreview(null) }} />
                      <span><strong>{weapon.name}</strong>{weapon.description && <small>{weapon.description}</small>}</span>
                    </label>)}
                  </div>
                </fieldset>
              </>}
              {step === 5 && preview && <>
                <h2 ref={title} tabIndex={-1}>Sua ficha, pronta para começar</h2>
                <p>O Mestre validou suas escolhas e calculou os valores abaixo. Revise tudo antes de confirmar.</p>
                <div className="wizard-summary" aria-label="Resumo da ficha validada">
                  <div className="wizard-summary-identity"><span className="section-kicker">Seu personagem</span><strong>{String(preview.character.name)}</strong><span>{chosenClass?.name} · Nível {String(preview.character.level)}</span></div>
                  <div className="wizard-summary-stats">
                    <span><small>PV</small><strong>{preview.derived.hp.current}/{preview.derived.hp.max}</strong></span>
                    <span><small>CA</small><strong>{preview.derived.ac.value}</strong></span>
                    <span><small>Iniciativa</small><strong>{formatModifier(preview.derived.initiative_modifier)}</strong></span>
                    <span><small>Proficiência</small><strong>{formatModifier(preview.derived.proficiency_bonus)}</strong></span>
                  </div>
                  <div className="wizard-summary-section"><h3>Atributos e modificadores</h3><dl>{options.abilities.map((ability) => <div key={ability.id}><dt>{ability.name}</dt><dd>{String((preview.character.abilities as Record<string, number>)[ability.id] ?? '—')} <small>({formatModifier(preview.derived.ability_modifiers[ability.id])})</small></dd></div>)}</dl></div>
                  <div className="wizard-summary-section"><h3>Perícias escolhidas</h3><dl>{skills.map((id) => <div key={id}><dt>{options.skills.find((skill) => skill.id === id)?.name}</dt><dd>{formatModifier(preview.derived.skill_modifiers[id])}</dd></div>)}</dl></div>
                  <div className="wizard-summary-section"><h3>Salvaguardas</h3><dl>{options.abilities.map((ability) => <div key={ability.id}><dt>{ability.name}</dt><dd>{formatModifier(preview.derived.saving_throw_modifiers[ability.id])}</dd></div>)}</dl></div>
                  <div className="wizard-summary-section"><h3>Arma inicial</h3><p>{options.weapons.find((weapon) => weapon.id === weaponId)?.name}{typeof preview.derived.weapons?.[weaponId]?.damage_dice === 'string' ? ` · ${preview.derived.weapons[weaponId].damage_dice}` : ''}</p></div>
                </div>
              </>}
            </div>
            {error && <div className="error-banner" role="alert"><span className="error-icon" aria-hidden="true">!</span><div><strong>Não foi possível continuar.</strong><p>{error}</p><p>Suas escolhas foram mantidas. Você pode tentar novamente.</p></div></div>}
            <div className="wizard-controls">
              {step > 0 && <button type="button" className="wizard-button wizard-button--back" disabled={busy} onClick={back}>Voltar</button>}
              <button type="submit" className="wizard-button wizard-button--primary" disabled={!complete || busy}>
                {busy ? step === 5 ? 'Criando personagem…' : 'Validando ficha…' : step === 5 ? 'Confirmar personagem' : 'Continuar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
