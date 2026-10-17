import {test,expect} from '@playwright/test';
test('English UI and medical content; switching language preserves the active session',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'English',exact:true}).first().click();
 await expect(page.getByRole('heading',{name:/A new day to learn/})).toBeVisible();await expect(page.locator('html')).toHaveAttribute('lang','en');
 await page.getByRole('button',{name:'Try a quiz',exact:true}).click();await expect(page.getByText('Your study level',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Let’s begin',exact:true}).click();
 await expect(page.getByText('Question 1 of 5',{exact:true})).toBeVisible();await expect(page.getByText('What is the most likely diagnosis?',{exact:true})).toBeVisible();
 const options=await page.getByRole('radio').allTextContents();await page.getByRole('radio').first().click();await page.getByRole('button',{name:'Check my answer',exact:true}).click();await expect(page.getByText('The clues that make the difference',{exact:true})).toBeVisible();await expect(page.getByText('Why the other answers are less likely',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Leave and resume later'}).click();await page.reload();await expect(page.getByRole('button',{name:'Resume my quiz',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Français',exact:true}).first().click();await page.getByRole('button',{name:'Reprendre mon quiz',exact:true}).click();await expect(page.getByText('Question 1 sur 5',{exact:true})).toBeVisible();await expect(page.getByText('Les indices qui font la différence',{exact:true})).toBeVisible();expect(await page.getByRole('radio').allTextContents()).not.toEqual(options);
 await page.getByRole('button',{name:'Quitter et reprendre plus tard'}).click();await page.getByRole('button',{name:'English',exact:true}).first().click();await page.getByRole('button',{name:'Resume my quiz',exact:true}).click();await expect(page.getByRole('radio').first()).toBeChecked();
});
