---
title: 强化学习基础：从 MDP 到 PPO、RLHF 与 DPO
date:
description: 整理强化学习的基本概念，以及从策略梯度、Actor-Critic 到 PPO、RLHF、DPO 和 GRPO 的关系。
categories:
  - AI
  - 强化学习
tags:
  - Reinforcement Learning
  - Policy Gradient
  - PPO
  - RLHF
  - DPO
  - GRPO
mathjax: true
---

## 什么是强化学习

强化学习处理的是决策问题，不只是预测问题。智能体做出一个动作后，环境会发生变化，智能体进入新的状态，再继续做下一次决策。这种前后相互影响的过程就是序贯决策。

普通聊天 LLM 可以粗略看成一个预测模型：根据已有文本预测下一个 token。Agent 则会调用工具、修改文件或与外部环境交互，每一步都会改变下一步面对的上下文，所以它更接近序贯决策问题。

### 基本元素

- Agent（智能体）：负责观察和决策。
- Environment（环境）：会随着动作不断变化的外部系统。
- State（状态）：智能体当前掌握的、足以支持决策的信息。
- Action（动作）：智能体在当前状态下可以做出的选择。
- Reward（奖励）：环境对刚才动作的即时反馈。
- Policy（策略）：在状态 $s$ 下选择动作 $a$ 的概率分布，记为 $\pi(a\mid s)$。

### Reward、Return 与 Value

Reward 是单步反馈，Return 是从当前时刻开始的累计奖励。考虑折扣因子 $\gamma\in[0,1]$ 时，时刻 $t$ 的 Return 为

$$
G_t=r_t+\gamma r_{t+1}+\gamma^2r_{t+2}+\cdots.
$$

$\gamma$ 越小，智能体越关注眼前奖励；越接近 1，越重视长期结果。

强化学习优化的是 Return 的期望。Value 不是当前立刻得到的奖励，而是对未来累计回报的估计。

### 强化学习的数据从哪里来

监督学习的数据通常是提前准备好的固定训练集。强化学习的数据由智能体与环境交互产生，因此策略一旦改变，后续行为、访问到的状态和收集到的数据分布都会跟着改变。

换句话说，策略决定了智能体会经历什么数据。这也是强化学习比普通监督学习更难稳定训练的原因之一。

### 多臂老虎机

多臂老虎机可以看成最简单的强化学习问题：没有复杂的状态转移，重点是如何平衡探索与利用。

- 探索：尝试还不确定、但可能更好的行为。
- 利用：选择当前已知表现最好的行为。

## MDP：马尔可夫决策过程

马尔可夫决策过程（Markov Decision Process，MDP）是描述序贯决策的数学框架。想用强化学习解决一个实际问题，通常先要把它抽象成 MDP。

### 马尔可夫性质

一个随机过程满足马尔可夫性质，表示在已知当前状态后，预测未来不再需要完整历史：

$$
P(S_{t+1}\mid S_t,S_{t-1},\ldots,S_0)
=P(S_{t+1}\mid S_t).
$$

这不是说过去没有影响，而是过去对未来的影响已经被压缩进当前状态。

状态设计因此很重要。假设状态里只有汽车当前位置，没有速度。两辆车即使位置相同，一辆静止、另一辆以 100 km/h 行驶，下一秒的情况也完全不同。这个状态就缺少预测未来所需的信息，不能很好地满足马尔可夫性质。

### 从马尔可夫过程到 MDP

马尔可夫过程只包含状态集合和状态转移：

$$
\langle \mathcal{S},P\rangle.
$$

加入奖励与折扣因子后，得到马尔可夫奖励过程（Markov Reward Process，MRP）：

$$
\langle \mathcal{S},P,R,\gamma\rangle.
$$

再加入动作集合，得到 MDP：

$$
\langle \mathcal{S},\mathcal{A},P,R,\gamma\rangle.
$$

其中 $P(s'\mid s,a)$ 描述在状态 $s$ 执行动作 $a$ 后转移到状态 $s'$ 的概率，$R$ 描述奖励。

### 状态价值、动作价值与优势

给定策略 $\pi$，状态价值函数为

$$
V^\pi(s)=\mathbb{E}_\pi[G_t\mid S_t=s].
$$

它表示从状态 $s$ 出发，之后一直按照策略 $\pi$ 行动时，预计能获得多少累计回报。

动作价值函数还指定当前先执行哪个动作：

$$
Q^\pi(s,a)=\mathbb{E}_\pi[G_t\mid S_t=s,A_t=a].
$$

优势函数比较某个动作与当前策略平均水平的差距：

$$
A^\pi(s,a)=Q^\pi(s,a)-V^\pi(s).
$$

$A^\pi(s,a)>0$ 表示这个动作比该状态下的平均表现更好。策略梯度算法的基本方向就是提高正优势动作的概率，降低负优势动作的概率。

### 轨迹与回合

智能体与环境持续交互会产生一条轨迹：

$$
\tau=(s_0,a_0,r_0,s_1,a_1,r_1,\ldots,s_T).
$$

Episode（回合）通常指一条有明确终点的轨迹。并非所有任务都有自然终点，所以轨迹和回合不能完全画等号。

## Policy Gradient：策略梯度

强化学习大致有两条路线：

- 基于价值的方法，例如 Q-learning、DQN：估计动作价值，再选择价值最大的动作。
- 基于策略的方法，例如 Policy Gradient：直接学习不同状态下的动作概率。

策略通常由神经网络表示。网络输入当前状态，输出各动作的概率；训练就是调整网络参数，使高回报动作更容易被选中。

策略梯度可以写成下面的形式：

$$
\nabla_\theta J(\theta)
=\mathbb{E}\left[
\nabla_\theta\log\pi_\theta(a_t\mid s_t)\,A_t
\right].
$$

$\theta$ 是策略网络参数，$A_t$ 是动作好坏的评价信号。直觉上，动作表现好就提高它的概率，表现差就降低它的概率。

### REINFORCE

REINFORCE 是最基础的蒙特卡洛策略梯度算法。它需要先采样完整轨迹，再用实际 Return $G_t$ 更新策略：

$$
\nabla_\theta J(\theta)
\approx
\sum_t \nabla_\theta\log\pi_\theta(a_t\mid s_t)G_t.
$$

它的问题是方差很大。同一个动作之后可能发生很多随机事件，最终 Return 不一定能准确说明这个动作本身有多好。加入状态相关的 baseline 可以降低方差，而 Actor-Critic 进一步用价值网络提供这个参照。

## Actor-Critic

Actor-Critic 可以理解成一个模型负责做决定，另一个模型负责评价这个决定是否比预期更好。

### Actor 与 Critic

Actor 是策略网络，输入状态并输出动作概率。它根据评价信号调整策略：评价为正就提高刚才动作的概率，评价为负就降低。

Critic 是价值网络，输入状态并估计 $V(s)$。它的学习目标是让当前预测接近“即时奖励 + 下一状态的价值”。

Actor 和 Critic 不是独立训练的：Actor 依赖 Critic 判断动作好坏，Critic 的训练数据又来自 Actor 与环境的交互。

### TD 误差

一步时序差分误差（Temporal-Difference Error）为

$$
\delta_t=r_t+\gamma V(s_{t+1})-V(s_t).
$$

$\delta_t>0$ 表示实际结果比 Critic 原先预期更好，Actor 应提高刚才动作的概率；$\delta_t<0$ 时则相反。它可以看成一个即时计算出来的 Advantage 估计。

REINFORCE 通常等完整轨迹结束后再更新，Actor-Critic 可以边交互边更新，但 Critic 预测不准时也会把误差传给 Actor。

## PPO：限制策略不要一次改得太猛

PPO（Proximal Policy Optimization）通常建立在 Actor-Critic 上。策略梯度虽然会提高好动作的概率，但如果一次更新太大，新策略可能突然偏离旧策略，训练就容易崩。PPO 的核心是限制新旧策略之间的变化幅度。

### 概率比例

PPO 用概率比例衡量策略变化：

$$
r_t(\theta)=
\frac{\pi_\theta(a_t\mid s_t)}
{\pi_{\theta_{\mathrm{old}}}(a_t\mid s_t)}.
$$

$r_t(\theta)>1$ 表示新策略比旧策略更倾向于选择这个动作，$r_t(\theta)<1$ 则表示概率降低。

### GAE

PPO 常用广义优势估计（Generalized Advantage Estimation，GAE）计算 Advantage：

$$
A_t^{\mathrm{GAE}}
=\delta_t+(\gamma\lambda)\delta_{t+1}
+(\gamma\lambda)^2\delta_{t+2}+\cdots.
$$

$\lambda$ 控制偏差与方差之间的权衡。它把后续多个 TD 误差合并起来，比只看一步更平滑。

### Clipped objective

PPO 的 clipped 目标函数为

$$
L^{\mathrm{CLIP}}(\theta)
=\mathbb{E}_t\left[
\min\left(
r_t(\theta)A_t,
\operatorname{clip}(r_t(\theta),1-\epsilon,1+\epsilon)A_t
\right)
\right].
$$

当概率比例超出 $[1-\epsilon,1+\epsilon]$ 时，clip 会限制继续增大的收益。PPO 不是禁止策略变化，而是不鼓励单次更新跨得太远。

## RLHF：用人类偏好训练语言模型

RLHF（Reinforcement Learning from Human Feedback）用于把人类偏好转成可优化的训练信号。SFT 能教模型模仿示范答案，但开放式任务往往没有唯一正确答案，偏好比较比手写标准答案更容易表达“哪个回答更好”。

一个典型流程是：

```text
预训练模型
    ↓
SFT
    ↓
对同一提示生成多个回答
    ↓
人类比较回答优劣
    ↓
训练 Reward Model
    ↓
使用 PPO 优化 Policy Model
    ↓
得到对齐后的模型
```

### PPO-RLHF 中的模型

| 模型 | 作用 | 训练状态 | 最终是否保留 |
| --- | --- | --- | --- |
| Actor / Policy Model | 生成回答，也是最终要优化的模型 | 训练 | 保留 |
| Reference Model | 限制策略不要偏离 SFT 模型太远 | 冻结 | 通常不用于部署 |
| Reward Model | 模拟人类偏好并给回答打分 | 提前训练，RL 阶段冻结 | 不用于部署 |
| Critic / Value Model | 估计状态价值，为 PPO 提供 Advantage | 训练 | 不用于部署 |

### Reward 与 Value 的关系

Reward Model 给完整回答一个偏好分数。训练时还会加入相对 Reference Model 的 KL 惩罚，避免 Policy 为了追求高分而偏离原模型太远。概念上可以写成

$$
r=r_\phi(x,y)-\beta D_{\mathrm{KL}}
\left(\pi_\theta\,\|\,\pi_{\mathrm{ref}}\right).
$$

这里 $r_\phi(x,y)$ 是 Reward Model 对提示 $x$ 和回答 $y$ 的评分，$\beta$ 控制 KL 惩罚强度。

Value Model 不负责给回答打偏好分，而是预测从当前生成状态继续下去的期望回报。PPO 再结合 Reward 与 Value 估计 Advantage。二者分别回答“这次结果得多少分”和“在这里通常能得多少分”。

## DPO：直接优化偏好数据

DPO（Direct Preference Optimization）绕过了单独训练 Reward Model 和在线运行 PPO 的过程。训练数据仍然是偏好对：同一个提示下，一个回答被选中，另一个回答被拒绝。

DPO 训练时主要有两个模型：

- Policy Model：正在优化的模型。
- Reference Model：冻结的参考模型，用来约束 Policy 不要偏离太远。

它形式上更接近监督学习，但优化目标来自偏好对，而不是单个标准答案。DPO 训练流程更简单，不过也依赖偏好数据的覆盖范围和质量。

## GRPO：用组内比较代替 Critic

GRPO（Group Relative Policy Optimization）保留了 PPO 的策略优化思路，但不再训练单独的 Critic。对于同一个提示，Policy 一次采样一组回答；每个回答得到奖励后，再与组内平均水平比较，得到相对 Advantage。

如果一组奖励为 $r_1,\ldots,r_G$，一种直观的标准化方式是

$$
A_i=\frac{r_i-\operatorname{mean}(r_1,\ldots,r_G)}
{\operatorname{std}(r_1,\ldots,r_G)+\varepsilon}.
$$

这样不需要额外训练与 Actor 规模相近的 Value Model，可以减少大模型后训练的显存和计算开销。代价是 Advantage 更依赖同组采样结果与奖励质量。

| 方法 | 独立 Critic | Advantage 来源 | 主要特点 |
| --- | --- | --- | --- |
| PPO | 通常需要 | Critic + GAE | 价值基线较稳定，但训练成本更高 |
| GRPO | 不需要 | 同一提示下的组内奖励比较 | 节省 Value Model 成本，但依赖组内采样 |
| DPO | 不需要 | 偏好对的直接优化目标 | 不运行在线 RL，训练流程更简单 |
