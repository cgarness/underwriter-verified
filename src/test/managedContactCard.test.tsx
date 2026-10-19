import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AgentData } from '@/contexts/AgentDataContext';
import Index from '@/pages/Index';
import BookCall from '@/pages/BookCall';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsAndConditions from '@/pages/TermsAndConditions';

const profile = vi.hoisted(() => ({ data: null as AgentData | null, isLoading: false, error: null }));
vi.mock('@/hooks/useAgentProfile', () => ({ useAgentProfile: () => profile }));
const agent: AgentData = { name:'Jordan Example',firstName:'Jordan',lastName:'Example',phone:'+15555550123',email:'',agency:'Example Life',npn:'synthetic',bio:'',shortBio:'',headshotUrl:'',calendarUrl:'#contact',stateLicenses:['CA - #SYNTHETIC'],testimonials:[],contactCardOnly:true };
function page(path: string) {
 return render(<MemoryRouter initialEntries={[path]}><Routes>
  <Route path='/:agencySlug/:agentSlug' element={<Index/>}/>
  <Route path='/:agencySlug/:agentSlug/bookcall' element={<BookCall/>}/>
  <Route path='/:agencySlug/:agentSlug/privacy-policy' element={<PrivacyPolicy/>}/>
  <Route path='/:agencySlug/:agentSlug/terms-and-conditions' element={<TermsAndConditions/>}/>
 </Routes></MemoryRouter>);
}
beforeEach(() => { profile.data = {...agent}; });
describe('ownerless managed public pages', () => {
 it('uses the shared UV layout with profile facts and opted-in contact links', () => {
  page('/example-life/jordan');
  expect(screen.getByRole('heading',{name:agent.name})).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Call'})).toHaveAttribute('href','tel:+15555550123');
  expect(screen.queryByRole('link',{name:'Email'})).not.toBeInTheDocument();
  expect(screen.queryByRole('link',{name:'Text'})).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.queryByText(/Agent Verified|book a call/i)).not.toBeInTheDocument();
  expect(document.title).toContain('Agent Profile');
  expect(screen.getByRole('banner')).toBeInTheDocument();
  expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'Licenses & Credentials'})).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'How I Can Help You'})).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:"Let's Build Your Plan"})).toBeInTheDocument();
  expect(screen.queryByLabelText('Verified agent')).not.toBeInTheDocument();
  expect(screen.queryByText(/fully licensed and regulated/)).not.toBeInTheDocument();
  expect(screen.queryByText('Messaging Program')).not.toBeInTheDocument();
  expect(document.querySelector('a[href$="/bookcall"],a[href$="/privacy-policy"],a[href$="/terms-and-conditions"]')).toBeNull();
 });
 it('shows the confirmed profile badge and optional bio without enabling intake', () => {
  profile.data={...agent,profileVerified:true,bio:'Helping families with clear guidance.'};
  page('/example-life/jordan');
  expect(screen.getByLabelText('Verified agent')).toHaveAttribute('title','Profile details confirmed by this agent');
  expect(screen.getByText('Helping families with clear guidance.')).toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('link',{name:'Text'})).not.toBeInTheDocument();
 });
 it('reflects removed license/contact and updated photo without defaults', () => {
  profile.data = {...agent,phone:'',email:'new@example.invalid',stateLicenses:[],npn:'',headshotUrl:'https://example.invalid/photo.png'};
  page('/example-life/jordan');
  expect(screen.queryByRole('link',{name:'Call'})).not.toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Email'})).toHaveAttribute('href','mailto:new@example.invalid');
  expect(screen.getByRole('img',{name:agent.name})).toHaveAttribute('src','https://example.invalid/photo.png');
  expect(screen.queryByText('State licenses on file')).not.toBeInTheDocument();
 });
 it.each(['bookcall','privacy-policy','terms-and-conditions'])('refuses direct %s route', route => {
  page('/example-life/jordan/'+route);
  expect(screen.getByText('Agent Not Found')).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
 });
});
