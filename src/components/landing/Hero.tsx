import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, Users, Calendar, Send } from 'lucide-react';

const Hero = () => {
  const { t, direction } = useLanguage();
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 -z-10"
        style={{ background: 'var(--gradient-hero)' }}
      />
      
      {/* Decorative elements - pointer-events-none to not block clicks */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-6 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
              <Send className="w-4 h-4" />
              Telegram Bot Integration
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight"
          >
            {t('landing.hero.title')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            {t('landing.hero.subtitle')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button 
              type="button"
              size="lg" 
              className="w-full sm:w-auto btn-primary-gradient text-base px-8 py-6 min-h-[56px] touch-manipulation cursor-pointer active:scale-95 transition-transform"
              onTouchEnd={(e) => {
                e.preventDefault();
                navigate('/auth?mode=signup');
              }}
              onClick={() => navigate('/auth?mode=signup')}
            >
              {t('landing.hero.cta')}
              <ArrowRight className={`w-5 h-5 ${direction === 'rtl' ? 'mr-2 rotate-180' : 'ml-2'}`} />
            </Button>
            <Button 
              type="button"
              variant="outline" 
              size="lg" 
              className="w-full sm:w-auto text-base px-8 py-6 min-h-[56px] touch-manipulation cursor-pointer active:scale-95 transition-transform"
              onTouchEnd={(e) => {
                e.preventDefault();
                navigate('/auth');
              }}
              onClick={() => navigate('/auth')}
            >
              {t('landing.hero.login')}
            </Button>
          </motion.div>
        </div>

        {/* Feature cards preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
        >
          {[
            { icon: Clock, label: t('feature.attendance') },
            { icon: Calendar, label: t('feature.leaves') },
            { icon: Users, label: t('feature.salaries') },
            { icon: Send, label: t('feature.telegram') },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
              className="glass-card rounded-xl p-4 text-center card-hover"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-accent flex items-center justify-center">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
