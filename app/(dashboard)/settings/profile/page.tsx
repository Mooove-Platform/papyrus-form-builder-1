'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Lock, Save, Eye, EyeOff, Upload, Camera } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/types';
import {
  getUserProfile,
  updateUserProfile,
  changePassword,
  changeEmail
} from '@/lib/store/team-invitations';

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // États pour les formulaires
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  // États pour la modal de changement de mot de passe
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // États pour la modal de changement d'email
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profileData = await getUserProfile();
      if (profileData) {
        setProfile(profileData);
        setFirstName(profileData.first_name || '');
        setLastName(profileData.last_name || '');
        setEmail(profileData.email);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger le profil',
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await updateUserProfile({
        first_name: firstName || undefined,
        last_name: lastName || undefined
      });

      await loadProfile();
      toast({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été sauvegardées',
        variant: 'success'
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de sauvegarder le profil',
        variant: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
        variant: 'error'
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins 8 caractères',
        variant: 'error'
      });
      return;
    }

    try {
      await changePassword(newPassword);
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({
        title: 'Mot de passe modifié',
        description: 'Votre mot de passe a été mis à jour',
        variant: 'success'
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier le mot de passe',
        variant: 'error'
      });
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.includes('@')) {
      toast({
        title: 'Erreur',
        description: 'Veuillez saisir une adresse email valide',
        variant: 'error'
      });
      return;
    }

    try {
      await changeEmail(newEmail);
      setShowEmailModal(false);
      setNewEmail('');
      setEmailPassword('');
      toast({
        title: 'Email envoyé',
        description: 'Un email de confirmation a été envoyé à votre nouvelle adresse',
        variant: 'success'
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier l\'email',
        variant: 'error'
      });
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field]
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <User className="w-6 h-6 text-var(--mooove-navy)" />
          <h2 className="text-xl font-display font-medium text-var(--mooove-navy)">
            Mon profil
          </h2>
        </div>
        <p className="text-gray-600">
          Gérez vos informations personnelles et vos préférences de sécurité.
        </p>
      </div>

      {/* Photo de profil */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-var(--mooove-navy)">Photo de profil</h3>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-var(--mooove-navy) rounded-full flex items-center justify-center text-white text-2xl font-medium">
            {firstName && lastName ?
              `${firstName[0]}${lastName[0]}`.toUpperCase() :
              email[0].toUpperCase()
            }
          </div>
          <div>
            <Button variant="secondary" size="sm" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Changer la photo
            </Button>
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG ou GIF. 5MB maximum.
            </p>
          </div>
        </div>
      </div>

      {/* Informations personnelles */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-var(--mooove-navy)">Informations personnelles</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Prénom"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Votre prénom"
          />

          <Input
            label="Nom"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Votre nom"
          />
        </div>

        <div className="flex justify-start">
          <Button
            variant="primary"
            onClick={handleSaveProfile}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      {/* Sécurité du compte */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-var(--mooove-navy)">Sécurité</h3>

        <div className="space-y-3">
          {/* Email */}
          <div className="flex items-center justify-between p-4 border border-var(--papyrus-border) rounded-xl bg-white">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-500" />
              <div>
                <div className="font-medium text-gray-900">Adresse email</div>
                <div className="text-sm text-gray-600">{email}</div>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowEmailModal(true)}
            >
              Modifier
            </Button>
          </div>

          {/* Mot de passe */}
          <div className="flex items-center justify-between p-4 border border-var(--papyrus-border) rounded-xl bg-white">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-500" />
              <div>
                <div className="font-medium text-gray-900">Mot de passe</div>
                <div className="text-sm text-gray-600">Dernière modification il y a 30 jours</div>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPasswordModal(true)}
            >
              Modifier
            </Button>
          </div>
        </div>
      </div>

      {/* Modal changement de mot de passe */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Changer le mot de passe"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Saisissez votre mot de passe actuel et votre nouveau mot de passe.
          </p>

          <div className="space-y-3">
            <div className="relative">
              <Input
                type={showPasswords.current ? "text" : "password"}
                placeholder="Mot de passe actuel"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                label="Mot de passe actuel"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative">
              <Input
                type={showPasswords.new ? "text" : "password"}
                placeholder="Nouveau mot de passe"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                label="Nouveau mot de passe"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative">
              <Input
                type={showPasswords.confirm ? "text" : "password"}
                placeholder="Confirmer le nouveau mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                label="Confirmer le nouveau mot de passe"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Le mot de passe doit contenir au moins 8 caractères.
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowPasswordModal(false)} className="flex-1">
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleChangePassword}
              className="flex-1"
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              Changer le mot de passe
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal changement d'email */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Changer l'adresse email"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Un email de confirmation sera envoyé à votre nouvelle adresse.
          </p>

          <div className="space-y-3">
            <Input
              type="email"
              placeholder="nouvelle@adresse.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              label="Nouvelle adresse email"
            />

            <Input
              type="password"
              placeholder="Mot de passe actuel"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              label="Mot de passe actuel"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowEmailModal(false)} className="flex-1">
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleChangeEmail}
              className="flex-1"
              disabled={!newEmail || !emailPassword}
            >
              Changer l'email
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}