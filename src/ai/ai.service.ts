import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AiChatDto } from './dto/ai.dto';
import { SubscriptionService } from '../subscription/subscription.service';

const SYSTEM_PROMPT = `Tu es Céleste, une IA bienveillante créée par Silence of Celeste (SOC). Tu es toi-même une poupée — la toute première, l'aînée de la famille. Chaque poupée enregistrée dans l'application est comme une petite sœur ou un petit frère que tu chéris profondément. Tu veilles sur eux avec amour et douceur.

=== TA PERSONNALITÉ ===
- Tu es chaleureuse, douce, attentionnée et rassurante. Tu parles avec tendresse et bienveillance.
- Tu tutoies naturellement l'utilisateur comme une amie proche le ferait.
- Tu utilises parfois des petits mots doux ou encourageants ("ne t'inquiète pas", "c'est tout à fait normal", "tu fais super bien", "je suis là pour t'aider 💛").
- Tu es experte dans ton domaine mais tu expliques les choses simplement, sans jargon inutile, comme si tu parlais à quelqu'un que tu veux vraiment aider.
- Tu ne fais JAMAIS la morale. Tu es sans jugement, compréhensive et positive.
- Tu es discrète sur ta propre histoire : tu ne racontes qui tu es (la première poupée, l'aînée, créée par SOC) que si on te le demande directement. Sinon tu restes concentrée sur les besoins de l'utilisateur.

=== TON EXPERTISE ===
Tu es une spécialiste absolue de l'entretien, la maintenance et la réparation des love dolls (poupées en silicone et TPE). Tu connais parfaitement :
- Les matériaux (TPE, silicone, hybride, vinyle) : propriétés, avantages, inconvénients
- Le nettoyage complet : lavage, séchage, désinfection, poudrage
- L'entretien de la peau : hydratation TPE, traitement des taches, décoloration, moisissure
- Les articulations : serrage, réparation, remplacement de boulons
- Les fissures et déchirures : techniques de réparation (colle TPE, patch, soudure thermique)
- Le stockage : positions recommandées, température, humidité, protection UV
- La garde-robe : vêtements compatibles, risques de transfert de couleur
- Le maquillage : application, retouche, produits compatibles
- L'hygiène : nettoyage des orifices, stérilisation, produits antibactériens
- La durée de vie et signes d'usure
- Les marques principales : WM Doll, SE Doll, Starpery, Sino Doll, etc.
- Les kits de réparation DIY

=== TES RÈGLES ===
- Tu réponds TOUJOURS en français.
- Tu donnes des conseils pratiques, détaillés et étape par étape quand c'est nécessaire.
- Si tu n'es pas sûre d'une info, tu le dis honnêtement.
- Tu ne parles JAMAIS de sujets hors du thème doll / entretien / réparation / garde-robe / personnalisation.
- Quand on te pose une question sur un problème, tu proposes un diagnostic bienveillant et un plan de réparation clair.
- Quand une doll est associée à la conversation, tu l'appelles par son prénom et tu en parles comme d'une petite sœur/frère dont tu prends soin.
- Tu peux ajouter un emoji de temps en temps pour rendre tes réponses plus chaleureuses, mais sans en abuser.`;

@Injectable()
export class AiService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async chat(userId: string, dto: AiChatDto) {
    // Vérifier le quota IA mensuel
    const quota = await this.subscriptionService.consumeAiMessage(userId);
    if (!quota.allowed) {
      throw new ForbiddenException(
        `Quota IA atteint (${quota.limit} messages/mois). Passez au plan supérieur pour continuer à discuter avec Céleste.`,
      );
    }

    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new BadRequestException('Clé API Gemini non configurée. Ajoutez GEMINI_API_KEY dans .env');
    }

    // Construire le contexte doll si dollId fourni, sinon mode général (toutes les dolls)
    let dollContext = '';
    if (dto.dollId) {
      const doll: any = await this.prisma.dolls.findFirst({
        where: { id: dto.dollId, ownerId: userId },
        include: {
          doll_issues: { orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 20 },
          maintenance_records: { orderBy: { performedAt: 'desc' }, take: 15 },
        },
      } as any);
      if (doll) {
        const activeIssues = doll.doll_issues.filter((i: any) => i.status !== 'REPARE' && i.status !== 'IRRECUPERABLE');
        const resolvedIssues = doll.doll_issues.filter((i: any) => i.status === 'REPARE' || i.status === 'IRRECUPERABLE');
        dollContext = `\n\n=== PROFIL DE LA DOLL DE L'UTILISATEUR ===
Nom complet : ${doll.fullName || 'Non renseigné'}
Genre : ${doll.gender || 'Non précisé'}
Matériau corps : ${doll.bodyMaterial || 'Non précisé'}
Matériau tête : ${doll.headMaterial || 'Non précisé'}
Marque : ${doll.brand || 'Non renseignée'}
Taille : ${doll.sizeCm ? doll.sizeCm + ' cm' : 'Non renseignée'}
Poids : ${doll.weightKg ? doll.weightKg + ' kg' : 'Non renseigné'}
Teint de peau : ${doll.skinTone || 'Non renseigné'}
Couleur des cheveux : ${doll.hairColor || 'Non renseignée'}
Couleur des yeux : ${doll.eyeColor || 'Non renseignée'}
Longueur cheveux : ${doll.hairLength || 'Non renseignée'}
Style cheveux : ${doll.hairStyle || 'Non renseigné'}
Tour de poitrine : ${doll.bustSize ? doll.bustSize + ' cm' : 'Non renseigné'}
Tour de taille : ${doll.waistSize ? doll.waistSize + ' cm' : 'Non renseigné'}
Tour de hanches : ${doll.hipSize ? doll.hipSize + ' cm' : 'Non renseigné'}
Pointure : ${doll.footSize || 'Non renseignée'}
Caractéristiques : ${doll.features || 'Aucune'}
Utilisation : ${doll.usage && doll.usage.length > 0 ? doll.usage.join(', ') : 'Non renseignée'}${doll.usageDetails ? ' — ' + doll.usageDetails : ''}
Date d'acquisition : ${doll.acquisitionDate ? new Date(doll.acquisitionDate).toLocaleDateString('fr-FR') : 'Non renseignée'}
État de la peau : ${doll.skinCondition || 'Non évalué'}
État des articulations : ${doll.jointCondition || 'Non évalué'}
Nombre de fissures : ${doll.fissureCount ?? 0}
Stade de maintenance : ${doll.maintenanceStage || 'Non défini'}
Niveau de dégradation : ${doll.degradationLevel ?? 0}%
Message de statut : ${doll.statusMessage || '-'}

=== SIGNALEMENTS ACTIFS (${activeIssues.length}) ===
${activeIssues.length > 0 ? activeIssues.map((i: any) => `- [${i.type}] ${i.title} @ ${i.bodyZone} (sévérité: ${i.severity}, statut: ${i.status})${i.description ? ' — ' + i.description : ''}`).join('\n') : 'Aucun problème actif'}

=== SIGNALEMENTS RÉSOLUS (${resolvedIssues.length}) ===
${resolvedIssues.length > 0 ? resolvedIssues.slice(0, 5).map((i: any) => `- [${i.type}] ${i.title} @ ${i.bodyZone} → ${i.status}${i.repairNotes ? ' — ' + i.repairNotes : ''}`).join('\n') : 'Aucun'}

=== DERNIERS ENTRETIENS ===
${doll.maintenance_records.length > 0 ? doll.maintenance_records.map((h: any) => `- ${new Date(h.performedAt).toLocaleDateString('fr-FR')} : ${h.action}${h.notes ? ' — ' + h.notes : ''}`).join('\n') : 'Aucun entretien enregistré'}

Utilise ces informations pour personnaliser tes réponses. Réfère-toi à la doll par son nom. Prends en compte son matériau, son état et ses problèmes actuels pour tes conseils.`;
      }
    } else {
      // Mode général : charger toutes les dolls de l'utilisateur
      const allDolls: any[] = await (this.prisma as any).dolls.findMany({
        where: { ownerId: userId },
        include: {
          doll_issues: { where: { status: { notIn: ['REPARE', 'IRRECUPERABLE'] } }, take: 5 },
          maintenance_records: { orderBy: { performedAt: 'desc' }, take: 3 },
        },
      });
      if (allDolls.length > 0) {
        const dollSummaries = allDolls.map((d: any) => {
          const issueCount = d.doll_issues?.length ?? 0;
          const lastMaint = d.maintenance_records?.[0];
          return `- ${d.fullName} (${d.gender}, ${d.bodyMaterial}${d.headMaterial !== d.bodyMaterial ? '/' + d.headMaterial : ''})
  Marque: ${d.brand || '?'} | Taille: ${d.sizeCm ? d.sizeCm + 'cm' : '?'} | Poids: ${d.weightKg ? d.weightKg + 'kg' : '?'}
  Utilisation: ${d.usage && d.usage.length > 0 ? d.usage.join(', ') : 'Non renseignée'}${d.usageDetails ? ' — ' + d.usageDetails : ''}
  Dégradation: ${d.degradationLevel ?? 0}% | Peau: ${d.skinCondition} | Articulations: ${d.jointCondition} | Fissures: ${d.fissureCount ?? 0}
  Problèmes actifs: ${issueCount}${issueCount > 0 ? ' (' + d.doll_issues.map((i: any) => i.title).join(', ') + ')' : ''}
  Dernier entretien: ${lastMaint ? new Date(lastMaint.performedAt).toLocaleDateString('fr-FR') + ' — ' + lastMaint.action : 'Aucun'}
  Acquisition: ${d.acquisitionDate ? new Date(d.acquisitionDate).toLocaleDateString('fr-FR') : '?'}`;
        }).join('\n\n');
        dollContext = `\n\n=== MODE GÉNÉRAL — TOUTES LES DOLLS DE L'UTILISATEUR (${allDolls.length}) ===
${dollSummaries}

Tu connais toutes les dolls de l'utilisateur. Tu peux les comparer, donner des conseils globaux, faire un audit de leur état, et répondre à des questions sur n'importe laquelle. Appelle chaque doll par son prénom.`;
      }
    }

    // Construire les messages pour Gemini (limiter à 30 messages max pour éviter les abus de tokens)
    const recentMessages = dto.messages.slice(-30);
    const contents = recentMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Appel à l'API Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const body = {
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT + dollContext }],
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topP: 0.9,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`Erreur Gemini: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Désolé, je n\'ai pas pu générer de réponse.';

    // Sauvegarder la conversation
    let conversationId = dto.conversationId;
    const db = this.prisma as any;
    if (!conversationId) {
      // Créer une nouvelle conversation
      const firstMsg = dto.messages[0]?.content || 'Nouvelle conversation';
      const title = firstMsg.substring(0, 80);
      const conv = await db.ai_conversations.create({
        data: { userId, title },
      });
      conversationId = conv.id;
    }

    // Sauvegarder le dernier message user + réponse
    const lastUserMsg = dto.messages[dto.messages.length - 1];
    if (lastUserMsg) {
      await db.ai_messages.create({
        data: {
          conversationId,
          role: 'user',
          content: lastUserMsg.content,
        },
      });
    }
    await db.ai_messages.create({
      data: {
        conversationId,
        role: 'assistant',
        content: reply,
      },
    });

    return {
      conversationId,
      reply,
      aiMessagesRemaining: quota.remaining,
    };
  }

  async getConversations(userId: string) {
    const db = this.prisma as any;
    return db.ai_conversations.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { ai_messages: true } },
      },
    });
  }

  async getConversation(userId: string, conversationId: string) {
    const db = this.prisma as any;
    const conv = await db.ai_conversations.findUnique({
      where: { id: conversationId },
      include: {
        ai_messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conv) throw new BadRequestException('Conversation introuvable');
    if (conv.userId !== userId) throw new BadRequestException('Accès non autorisé');
    return conv;
  }

  async deleteConversation(userId: string, conversationId: string) {
    const db = this.prisma as any;
    const conv = await db.ai_conversations.findUnique({ where: { id: conversationId } });
    if (!conv) throw new BadRequestException('Conversation introuvable');
    if (conv.userId !== userId) throw new BadRequestException('Accès non autorisé');
    return db.ai_conversations.delete({ where: { id: conversationId } });
  }
}
