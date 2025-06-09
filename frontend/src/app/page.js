'use client';
import { motion } from 'framer-motion';
import { Bolt, AutoAwesome, Analytics, Security, Telegram, ArrowOutward, Terminal, Code, DataObject, IntegrationInstructions, LightMode, DarkMode } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import styles from './page.module.scss';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5
    }
  }
};

const featureVariants = {
  hover: {
    y: -5,
    boxShadow: "0 10px 25px rgba(0, 150, 255, 0.3)"
  }
};

export default function Home() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    // Check for saved theme preference or use system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme(systemPrefersDark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    // Apply theme class to document
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <motion.main 
      className={styles.container}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Theme Toggle Button */}
      <button className={styles.themeToggle} onClick={toggleTheme}>
        {theme === 'dark' ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
      </button>
      
      {/* Animated Circuit Background */}
      <div className={styles.circuitBackground}></div>
      
      <motion.header className={styles.header} variants={itemVariants}>
        <div className={styles.logo}>
          <Terminal className={styles.logoIcon} />
          <h1>SubEngine</h1>
        </div>
        <motion.a 
          href="https://t.me/SubEngineBot" 
          className={styles.ctaButton}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Telegram fontSize="small" /> Add to Telegram
        </motion.a>
      </motion.header>

      {/* Centered Hero Section */}
      <section className={styles.hero}>
        <motion.div 
          className={styles.heroContent}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className={styles.techBadge}>
            <Code fontSize="small" /> AI-POWERED TELEGRAM BOT
          </div>
          <h1>Automate Your <span>Telegram</span> Community Management</h1>
          <p className={styles.subtitle}>
            SubEngine uses advanced algorithms to track payments, remove inactive users, 
            and optimize your groups performance — automatically.
          </p>
          
          <div className={styles.heroButtons}>
            <motion.a 
              href="https://t.me/SubEngineBot" 
              className={styles.primaryButton}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Terminal fontSize="small" /> Connect Bot
            </motion.a>
            <motion.a 
              href="#features" 
              className={styles.secondaryButton}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <IntegrationInstructions fontSize="small" /> Explore Features
            </motion.a>
          </div>
        </motion.div>

        {/* Animated Tech Elements */}
        <div className={styles.techElements}>
          <div className={styles.codeSnippet}>
            <pre>
              <code>
{`1  // SubEngine AI Core
2  function manageGroup() {
3    trackPayments();
4    analyzeActivity();
5    removeInactiveUsers();
6    optimizeEngagement();
7  }`}
              </code>
            </pre>
          </div>
          <div className={styles.dataGrid}>
            {[...Array(16)].map((_, i) => (
              <motion.div 
                key={i}
                className={styles.dataCell}
                animate={{ opacity: [0.2, 0.8, 0.2] }}
                transition={{ 
                  duration: 1.5 + Math.random(),
                  repeat: Infinity,
                  delay: Math.random() * 2
                }}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="features" className={styles.features}>
        <motion.h3 variants={itemVariants}>
          <DataObject fontSize="inherit" /> Core Features
        </motion.h3>
        
        <div className={styles.featuresGrid}>
          <motion.div 
            className={styles.featureCard}
            variants={featureVariants}
            whileHover="hover"
          >
            <div className={styles.featureIcon}>
              <Bolt fontSize="inherit" />
            </div>
            <h4>Payment Automation</h4>
            <p>Real-time tracking and verification of member payments with blockchain-level security.</p>
            <div className={styles.techTag}>AI-Verified</div>
          </motion.div>
          
          <motion.div 
            className={styles.featureCard}
            variants={featureVariants}
            whileHover="hover"
          >
            <div className={styles.featureIcon}>
              <AutoAwesome fontSize="inherit" />
            </div>
            <h4>Smart Cleanup</h4>
            <p>Machine learning identifies and removes inactive users while preserving engagement.</p>
            <div className={styles.techTag}>ML-Powered</div>
          </motion.div>
          
          <motion.div 
            className={styles.featureCard}
            variants={featureVariants}
            whileHover="hover"
          >
            <div className={styles.featureIcon}>
              <Analytics fontSize="inherit" />
            </div>
            <h4>Performance Analytics</h4>
            <p>Detailed metrics and predictive insights about your groups health and growth.</p>
            <div className={styles.techTag}>Predictive AI</div>
          </motion.div>
        </div>
      </section>

      <section className={styles.howItWorks}>
        <motion.h3 variants={itemVariants}>
          <IntegrationInstructions fontSize="inherit" /> System Architecture
        </motion.h3>
        
        <div className={styles.architecture}>
          <div className={styles.architectureStep}>
            <div className={styles.stepNumber}>1</div>
            <h4>Integration</h4>
            <p>Add SubEngine to your Telegram group with one click</p>
          </div>
          
          <div className={styles.architectureLine}></div>
          
          <div className={styles.architectureStep}>
            <div className={styles.stepNumber}>2</div>
            <h4>Configuration</h4>
            <p>Set your rules via simple commands</p>
          </div>
          
          <div className={styles.architectureLine}></div>
          
          <div className={styles.architectureStep}>
            <div className={styles.stepNumber}>3</div>
            <h4>Automation</h4>
            <p>AI handles all management tasks</p>
          </div>
        </div>
      </section>

      <motion.footer 
        className={styles.footer}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <Terminal fontSize="large" />
            <h3>SubEngine</h3>
            <p>AI Telegram Group Management</p>
          </div>
          
          <div className={styles.footerLinks}>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="https://t.me/SubEngineSupport" target="_blank" rel="noopener noreferrer">Support</a>
          </div>
        </div>
        
        <div className={styles.copyright}>
          © {new Date().getFullYear()} SubEngine AI Systems. All rights reserved.
        </div>
      </motion.footer>
    </motion.main>
  );
}