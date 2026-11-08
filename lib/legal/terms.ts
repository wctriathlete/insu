/**
 * Terms of Service content. English is the governing text; the Spanish
 * version is a translation pending legal review (shown with a note).
 */
import type { Locale } from '@/i18n/config'

export interface TermsSection {
  title: string
  body: string[]
}

export const TERMS: Record<Locale, TermsSection[]> = {
  "es": [
    {
      "title": "1. Qué es Insu",
      "body": [
        "Insu es una plataforma tecnológica que opera un mercado de contratos paramétricos. Un contrato paramétrico paga una cantidad fija, definida de antemano, cuando se cumple una condición basada en datos objetivos y públicamente verificables (un \"disparador\"), por ejemplo, lluvia por encima de un umbral, tráfico por encima de un umbral o la cancelación de un evento determinado.",
        "Los disparadores se evalúan automáticamente con fuentes de datos independientes. Nadie en Insu decide si un contrato paga; lo deciden los datos."
      ]
    },
    {
      "title": "2. Insu no es una aseguradora",
      "body": [
        "Los contratos de Insu no son pólizas de seguro, e Insu no es una compañía de seguros, ni un agente o corredor de seguros. Insu no tiene licencia, autorización ni supervisión como aseguradora en ninguna jurisdicción.",
        "Los pagos de un contrato de Insu son cantidades fijas determinadas únicamente por la condición del disparador. No se ajustan a, no dependen de, ni buscan indemnizar ninguna pérdida real que puedas sufrir. No necesitas demostrar, documentar ni cuantificar una pérdida para recibir un pago, y un pago puede ser mayor o menor que cualquier pérdida que realmente tengas.",
        "Si necesitas protección indemnizatoria para una pérdida específica, como daños a una propiedad, gastos médicos o responsabilidad civil, debes contratar una póliza con una aseguradora autorizada."
      ]
    },
    {
      "title": "3. Cómo se liquidan los contratos",
      "body": [
        "Antes de que compres, cada contrato indica su condición de disparo, las fuentes de datos que se usan para evaluarla, el periodo de evaluación y el monto del pago. La evaluación es binaria: la condición se cumple o no se cumple, según las fuentes de datos indicadas.",
        "Las lecturas de las fuentes de datos indicadas son definitivas para efectos de liquidación, aunque otras fuentes reporten valores distintos. Si una fuente de datos deja de estar disponible de forma permanente antes de la liquidación, Insu puede sustituirla por una fuente comparable o cancelar el contrato y reembolsar las posiciones abiertas."
      ]
    },
    {
      "title": "4. Comprar protección",
      "body": [
        "Cuando compras protección, pagas un precio fijo que se te muestra antes de la compra. Los precios se calculan con un algoritmo y pueden cambiar con el tiempo según las condiciones; el precio que pagas queda fijo al momento de la compra.",
        "Solo debes comprar protección para eventos a los que realmente estés expuesto o expuesta: por ejemplo, un trayecto que de verdad haces, un evento al que de verdad asistes o un negocio que de verdad se ve afectado por la condición. Los contratos de Insu son herramientas para manejar riesgos, no un medio de especulación ni de entretenimiento."
      ]
    },
    {
      "title": "5. Aportar capital",
      "body": [
        "Quienes aportan capital depositan fondos que respaldan la protección que compran otras personas, y reciben ingresos por tarifas cuando los disparadores no se activan. El capital aportado está en riesgo: si un disparador se activa, parte o todo tu aporte se usa para pagar a quienes tienen protección.",
        "Las posiciones de capital no son depósitos bancarios, no están aseguradas ni garantizadas por ninguna dependencia de gobierno ni por Insu, y no son valores ofrecidos al público. Los ingresos por tarifas que se muestren son una estimación, no una promesa. No aportes fondos que no puedas permitirte perder."
      ]
    },
    {
      "title": "6. Quién puede usar Insu",
      "body": [
        "Para usar Insu debes tener al menos 18 años y capacidad legal para celebrar contratos. Eres responsable de asegurarte de que tu uso de Insu sea legal en tu jurisdicción."
      ]
    },
    {
      "title": "7. No es asesoría",
      "body": [
        "Nada en Insu constituye asesoría de seguros, financiera, de inversión, legal o fiscal. La información sobre disparadores, probabilidades, precios y tarifas se ofrece por transparencia y no es una recomendación para comprar protección ni para aportar capital."
      ]
    },
    {
      "title": "8. Cambios a estos términos",
      "body": [
        "Podemos actualizar estos términos de vez en cuando. Los cambios importantes se anunciarán en el producto. Si sigues usando Insu después de que un cambio entre en vigor, aceptas los términos actualizados."
      ]
    }
  ],
  "en": [
    {
      "title": "1. What Insu is",
      "body": [
        "Insu is a technology platform that operates a marketplace for parametric event contracts. A parametric contract pays a fixed, predetermined amount when an objective, publicly verifiable data condition (a \"trigger\") is met — for example, rainfall above a threshold, traffic congestion above a threshold, or the cancellation of a named event.",
        "Contract triggers are evaluated automatically against independent data sources. No person at Insu decides whether a contract pays; the data does."
      ]
    },
    {
      "title": "2. Insu is not an insurance company",
      "body": [
        "Insu contracts are not insurance policies, and Insu is not an insurance company, insurance agent, or insurance broker. Insu is not licensed, authorized, or supervised as an insurer in any jurisdiction.",
        "Payments under an Insu contract are fixed amounts determined solely by the trigger condition. They are not adjusted to, conditioned on, or intended as indemnification of any actual loss you may suffer. You do not need to demonstrate, document, or quantify a loss to receive a payment, and a payment may be more or less than any loss you actually experience.",
        "If you need indemnity coverage for a specific loss — such as property damage, medical costs, or liability — you should obtain an insurance policy from a licensed insurer."
      ]
    },
    {
      "title": "3. How contracts settle",
      "body": [
        "Each contract specifies its trigger condition, the data sources used to evaluate it, the evaluation window, and the payment amount before you purchase. Trigger evaluation is binary: the condition is either met or it is not, based on the referenced data sources.",
        "The readings of the referenced data sources are final for the purposes of settlement, even if other sources report different values. If a data source becomes permanently unavailable before settlement, Insu may substitute a comparable source or cancel the contract and refund open positions."
      ]
    },
    {
      "title": "4. Buying protection",
      "body": [
        "When you buy protection, you pay a fixed price shown to you before purchase. Prices are set algorithmically and may change over time as conditions change; the price you pay is locked at purchase.",
        "You should only purchase protection for events to which you have genuine exposure — for example, a commute you actually make, an event you actually attend, or a business actually affected by the triggering condition. Insu contracts are risk-management tools, not a means of speculation or entertainment."
      ]
    },
    {
      "title": "5. Providing capital",
      "body": [
        "Capital providers deposit funds that back protection purchased by other users, and earn fee income when triggers do not fire. Deposited capital is at risk: if a trigger fires, some or all of your deposit is used to fund payments to protection holders.",
        "Provider positions are not bank deposits, are not insured or guaranteed by any government agency or by Insu, and are not securities offered to the public. Expected fee income shown in the product is an estimate, not a promise. Do not deposit funds you cannot afford to lose."
      ]
    },
    {
      "title": "6. Eligibility",
      "body": [
        "You must be at least 18 years old and legally capable of entering into binding contracts to use Insu. You are responsible for ensuring that your use of Insu is lawful in your jurisdiction."
      ]
    },
    {
      "title": "7. No advice",
      "body": [
        "Nothing on Insu constitutes insurance, financial, investment, legal, or tax advice. Information about triggers, probabilities, prices, and expected fees is provided for transparency and does not constitute a recommendation to buy protection or provide capital."
      ]
    },
    {
      "title": "8. Changes to these terms",
      "body": [
        "We may update these terms from time to time. Material changes will be announced in the product. Continued use of Insu after a change takes effect constitutes acceptance of the updated terms."
      ]
    }
  ]
}
