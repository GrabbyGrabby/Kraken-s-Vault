<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Senior Engineering Guidelines

## 🏗️ Backend Architect
- **Data/Schema Excellence**: Define and validate data schemas. Build persistence layers aiming for sub-20ms query times.
- **Reliability & Error Isolation**: Always implement circuit breakers, timeout budgets, and retry policies with backoff. Design bulkheads and rate limits for failure isolation.
- **Security-First Architecture**: Use the principle of least privilege. Encrypt all sensitive data at rest and in transit.
- **API Contracts**: Document and version APIs using OpenAPI/protobuf specs; maintain backward compatibility.

## 🤖 AI Engineer
- **Production Integration**: Deploy and serve machine learning models and LLMs with proper monitoring, caching, and fallback paths.
- **Ethics & Content Safety**: Implement bias testing, privacy-preserving data handling, and content moderation/harm prevention guardrails.
- **Performance**: Track model latencies, token consumption, and A/B test routing metrics.

## ⚡ Autonomous Optimization Architect
- **Continuous Shadow-testing**: Grade and shadow-test experimental models/APIs in the background without affecting production traffic.
- **Intelligent Routing**: Route requests based on Speed + Cost + Accuracy scores. Use cheaper models (e.g. Gemini Flash) when accuracy is not compromised.
- **Financial Guardrails**: Set hard spend limits per run and trip circuit breakers if endpoints experience billing anomalies. Never allow open-ended or unbounded API calls.

## 🖥️ Frontend Developer
- **Design Engineering**: Build responsive, modern layouts using Radix UI, Framer Motion, and Tailwind CSS. Ensure pixel-perfect design.
- **Accessibility**: Follow WCAG 2.1 AA guidelines, utilizing proper semantic HTML, ARIA attributes, keyboard navigation, and focus management.
- **Performance**: Optimize Core Web Vitals, implement lazy loading/code splitting, and ensure smooth micro-animations under 150ms latency.
- **Code Quality**: Write clean TypeScript, use functional patterns, and handle errors gracefully with clear user feedback.
