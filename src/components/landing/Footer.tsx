import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="py-12 bg-muted/50 border-t border-border">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Auto Missions Bot" className="w-8 h-8 rounded-lg" />
            <span className="font-semibold text-foreground">Auto Missions Bot</span>
          </div>
          
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">
              Contact
            </Link>
          </nav>
          
          <p className="text-sm text-muted-foreground">
            © 2025 Auto Missions Bot. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
