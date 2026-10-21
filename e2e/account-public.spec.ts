import {test,expect} from '@playwright/test';
test('public profile: Google, free quota and Stripe configuration in both languages',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Profil',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Adresse e-mail',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Recevoir mon lien',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Continuer avec Google',exact:true})).toBeVisible();
 await expect(page.getByText('Gratuit · 3 sessions de 10 questions par jour',{exact:true})).toBeVisible();
 await expect(page.getByText('Les abonnements Premium seront disponibles après configuration de Stripe et des tarifs. Aucun paiement n’est disponible actuellement.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'English',exact:true}).first().click();
 await expect(page.getByRole('textbox',{name:'Email address',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Continue with Google',exact:true})).toBeVisible();
 await expect(page.getByText('Free · 3 sessions of up to 10 questions per day',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Send my sign-in link',exact:true})).toBeDisabled();
});