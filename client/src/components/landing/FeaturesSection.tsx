import { motion } from "framer-motion";
import {
  Newspaper,
  Users,
  Building2,
  MessageCircleHeart,
} from "lucide-react";

const features = [
  {
    icon: Newspaper,
    title: "Student Feed",
    description:
      "Share thoughts, join conversations, and stay connected with campus life through a real-time microblogging feed.",
  },
  {
    icon: Users,
    title: "Parents Hub",
    description:
      "Verified access for parents and guardians to stay informed about campus activities, events, and official updates.",
  },
  {
    icon: Building2,
    title: "Clubs & Societies",
    description:
      "Discover, join, and manage student organizations. Post events, recruit members, and build your campus community.",
  },
  {
    icon: MessageCircleHeart,
    title: "Campus Confessions",
    description:
      "Anonymous campus confessions with responsible moderation. Express yourself freely with community safeguards.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function FeaturesSection() {
  return (
    <section className="py-24 px-6">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            Everything Your Campus Needs
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A unified digital ecosystem designed to improve communication,
            engagement, and transparency across your university community.
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group bg-card rounded-2xl border border-border p-6 hover:shadow-lg hover:border-gold/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-4 group-hover:bg-gold/20 transition-colors duration-300">
                <feature.icon className="w-6 h-6 text-primary group-hover:text-gold transition-colors duration-300" />
              </div>
              <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
