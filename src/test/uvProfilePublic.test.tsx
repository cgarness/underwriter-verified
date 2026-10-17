import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentDataProvider, PublicAgentDataProvider, useAgentData, type AgentData } from '@/contexts/AgentDataContext';
import HeroSection from '@/components/HeroSection';
import { websiteOwnedFields } from '@/lib/agentProfileEditing';
const agent: AgentData = { name:'Jordan Example',firstName:'Jordan',lastName:'Example',phone:'',email:'',agency:'Example Life',npn:'synthetic',bio:'',shortBio:'',headshotUrl:'',calendarUrl:'#contact',stateLicenses:[],testimonials:[] };
function Data() { const {data}=useAgentData(); return <div data-testid="resolved">{JSON.stringify(data)}</div>; }
describe('public profile identity and contact publication', () => {
 it('uses the resolved agent on first render, not saved/default Christopher data', () => {
  localStorage.setItem('agent-data',JSON.stringify({...agent,name:'Wrong cached agent'}));
  render(<AgentDataProvider><PublicAgentDataProvider data={agent}><Data/><HeroSection/></PublicAgentDataProvider></AgentDataProvider>);
  expect(screen.getByTestId('resolved').textContent).toBe(JSON.stringify(agent));
  expect(screen.queryByText('Wrong cached agent')).not.toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Jordan Example profile initials')).toHaveTextContent('JE');
  expect(screen.queryByRole('link',{name:'Call'})).not.toBeInTheDocument();
  expect(screen.queryByRole('link',{name:'Text'})).not.toBeInTheDocument();
  expect(screen.queryByRole('link',{name:'Email'})).not.toBeInTheDocument();
 });
 it('updates identity directly when agent data changes and never persists public browsing', () => {
  localStorage.removeItem('agent-data');
  const page=render(<PublicAgentDataProvider data={agent}><Data/></PublicAgentDataProvider>);
  page.rerender(<PublicAgentDataProvider data={{...agent,name:'Taylor Example'}}><Data/></PublicAgentDataProvider>);
  expect(screen.getByTestId('resolved')).toHaveTextContent('Taylor Example');
  expect(localStorage.getItem('agent-data')).toBeNull();
 });
 it('shows only explicitly present contact methods and the correct photo', () => {
  render(<PublicAgentDataProvider data={{...agent,phone:'+15555550123',headshotUrl:'https://images.example.com/jordan.png'}}><HeroSection/></PublicAgentDataProvider>);
  expect(screen.getByRole('link',{name:'Call'})).toHaveAttribute('href','tel:+15555550123');
  expect(screen.getByRole('link',{name:'Text'})).toHaveAttribute('href','sms:+15555550123');
  expect(screen.queryByRole('link',{name:'Email'})).not.toBeInTheDocument();
  expect(screen.getByRole('img',{name:agent.name})).toHaveAttribute('src','https://images.example.com/jordan.png');
 });
 it('linked owner save payload excludes all AF identity, ownership and publication fields', () => {
  const fields=websiteOwnedFields({...agent,bio:'Authentic biography',testimonials:[]});
  expect(fields).toEqual({bio:'Authentic biography',short_bio:'',calendar_url:'#contact',testimonials:[]});
  for(const key of ['user_id','slug','agency_slug','phone','email','first_name','last_name','npn','state_licenses','managed_by_agentflow','is_published']) expect(fields).not.toHaveProperty(key);
 });
});
