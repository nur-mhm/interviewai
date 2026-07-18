export interface DemoProfile {
  id: string;
  title: string;
  company: string;
  role: string;
  fileName: string;
  resumeText: string;
}

export const DEMO_PROFILES: DemoProfile[] = [
  {
    id: 'swe-google',
    title: 'Software Engineer',
    company: 'Google',
    role: 'Senior Software Engineer, Core Infrastructure',
    fileName: 'alex_chen_software_engineer.pdf',
    resumeText: `ALEX CHEN
San Francisco, CA | alexchen@example.com | github.com/alexchen

PROFESSIONAL SUMMARY
Results-driven Senior Software Engineer with 6+ years of experience designing, building, and scaling high-throughput distributed systems. Specialized in full-stack web applications, React, TypeScript, Node.js, and cloud orchestration.

EXPERIENCE
Lead Software Engineer | TechCorp (2022 - Present)
- Architected and deployed a microservice-based real-time data streaming platform handling over 50,000 requests/sec with Node.js and Redis.
- Managed a team of 4 frontend developers to build an analytics dashboard with React and Tailwind CSS, reducing page load times by 40%.
- Initiated migration from REST to GraphQL APIs, resulting in a 35% reduction in mobile client payload size.

Software Engineer II | DevStudio (2020 - 2022)
- Re-architected a legacy Rails app into a modern TypeScript backend service, improving server response times by 50%.
- Integrated robust automated testing pipelines (Jest, Cypress), boosting code coverage from 45% to 88%.
- Optimized database query structures in PostgreSQL, decreasing database CPU utilization during peak loads by 30%.

TECHNICAL SKILLS
- Languages: TypeScript, JavaScript, Python, SQL, Go
- Frameworks & Libs: React, Next.js, Node.js, Express, Tailwind CSS, Jest
- Infrastructure & Storage: AWS, Docker, Kubernetes, PostgreSQL, Redis, GraphQL
- Tools: Git, CI/CD, Webpack, Vite`
  },
  {
    id: 'pm-stripe',
    title: 'Product Manager',
    company: 'Stripe',
    role: 'Technical Product Manager, Developer Platform',
    fileName: 'sarah_jenkins_product_manager.pdf',
    resumeText: `SARAH JENKINS
New York, NY | sarahjenkins@example.com | linkedin.com/in/sarahj

PROFESSIONAL SUMMARY
Impact-oriented Technical Product Manager with 5 years of experience leading cross-functional teams to ship developer-first products. Proven track rate in API design, developer tooling, and scaling payment workflows.

EXPERIENCE
Senior Product Manager | PaySphere (2023 - Present)
- Spearheaded the product strategy and roadmap for a new developer SDK, resulting in a 120% growth in API integration speed.
- Collaborated with 15 engineers and designers to launch a global checkout product, capturing $45M in net-new processing volume.
- Conducted regular customer interviews and quantitative analysis (using Mixpanel and SQL) to redesign developer documentation, reducing onboarding support tickets by 50%.

Associate Product Manager | SaaSify (2021 - 2023)
- Owned the integrations marketplace platform, adding 15 new partner integrations and driving a 20% increase in customer retention.
- Defined product requirements (PRDs), product specs, and success metrics for SaaS platform billing migrations.
- Coordinated with Sales, Marketing, and Customer Success for product launches, training over 100 internal stakeholders.

SKILLS & EDUCATION
- Product Methodologies: Agile/Scrum, Product Roadmap, PRD Authoring, A/B Testing, User Research
- Technical Skills: SQL, REST APIs, JSON, Python, Analytics tools (Amplitude, Mixpanel, Tableau)
- Education: B.S. in Computer Science & Business Admin, NYU`
  },
  {
    id: 'ds-netflix',
    title: 'Data Scientist',
    company: 'Netflix',
    role: 'Data Scientist, Algorithms & Personalization',
    fileName: 'marcus_vance_data_scientist.pdf',
    resumeText: `MARCUS VANCE
Seattle, WA | marcusvance@example.com

PROFESSIONAL SUMMARY
Data Scientist with 4+ years of industry experience building end-to-end machine learning systems. Expert in predictive modeling, deep learning, personalization recommenders, and rigorous statistical A/B testing.

EXPERIENCE
Data Scientist | StreamFlow (2022 - Present)
- Built and optimized user recommendation models in Python and PyTorch, increasing click-through rates (CTR) on suggested content by 18%.
- Designed and analyzed 50+ concurrent A/B experiments on homepage layouts, resulting in a 4.5% lift in core user engagement.
- Developed scalable feature engineering pipelines in Spark, processing over 10TB of daily user interaction data.

Machine Learning Engineer | DataLabs (2020 - 2022)
- Implemented and tuned natural language processing (NLP) classifiers for customer sentiment, achieving a 92% F1 score.
- Set up automated ML training pipelines using Kubeflow, reducing model retraining lifecycle from 2 weeks to 1 day.
- Authored production-ready APIs with FastAPI to serve machine learning predictions with sub-30ms latency.

TECHNICAL SKILLS
- Machine Learning: PyTorch, Scikit-Learn, TensorFlow, XGBoost, Transformers, NLP
- Languages & Data Tools: Python, SQL, R, PySpark, Bash, Docker
- Mathematics & Analytics: A/B Testing, Hypothesis Testing, Regression, Time-Series Forecasting
- Systems: AWS, Snowflake, Airflow, FastAPI, Git`
  }
];
